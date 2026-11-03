// Orchestrates analysis, lock and hook gates for the active Spec Kit feature (US1; data-model.md).
// Kept free of vscode imports: the UI, the workspace view and l10n are injected, so the flows run
// under node:test with real files and a real hook server.

import { createHash, randomBytes } from "node:crypto";
import * as path from "node:path";
import type { ActiveFeature } from "./specKitWatcher";
import { ClaudeSettingsStore } from "./claudeSettingsStore";
import { HookBody, HookServer } from "./hookServer";
import { resolveSessionModel, SessionModels, transcriptCreatedAt } from "./sessionModels";
import { TrackingStore } from "../persistence/trackingStore";
import { SummaryStore, summaryId } from "../persistence/summaryStore";
import { recommend, Thresholds } from "../domain/classification";
import {
  applyModel,
  isEmptySettings,
  restoreModel,
  SettingsDoc,
  SettingsParseError,
  takeKeySnapshot,
  upsertTokenomistHooks,
} from "../domain/claudeSettingsDoc";
import {
  decideExpansion,
  decidePreModelSwitch,
  expansionResponse,
  GateContext,
  preModelSwitchResponse,
} from "../domain/gateDecisions";
import { dominantModel, estimateSavings } from "../domain/savings";
import { analyzeText } from "../domain/scoring";
import { isComplete } from "../domain/tasksProgress";
import { managesModelKey, transition, TrackingEvent } from "../domain/tracking";
import { isModel, Mode, Model, modelFamily, SpecAnalysis, SpecSummary, SpecTracking } from "../domain/types";

export interface WorkspaceView {
  readonly root: string;
  readonly activeFeature: ActiveFeature | undefined;
  readSpec(feature?: ActiveFeature): Promise<string | undefined>;
  readTasks(feature?: ActiveFeature): Promise<string | undefined>;
  hasPlan(feature?: ActiveFeature): Promise<boolean>;
}

export interface TrackerSettings {
  mode: Mode;
  thresholds: Thresholds;
  writingModel: Model;
}

export interface TrackerUi {
  recommendationReady(analysis: SpecAnalysis): void;
  pickModel(analysis: SpecAnalysis | undefined): Promise<{ model: Model; manualOverride: boolean } | undefined>;
  /** Tells the user the lock applies to new conversations and offers to start one. */
  modelLocked(model: Model): void;
  askUnlockedPlan(recommended: Model | undefined): Promise<"approve" | "change" | "continue" | undefined>;
  askSessionMismatch(locked: Model): Promise<"newConversation" | "continue" | undefined>;
  askOverride(locked: Model, target: Model | undefined): Promise<"update" | "revert" | undefined>;
  askFinish(specName: string): Promise<"finish" | "notYet" | undefined>;
  showSummary(summary: SpecSummary): void;
  warn(message: string): void;
}

export interface TrackerDeps {
  workspace: WorkspaceView;
  settingsStore: ClaudeSettingsStore;
  trackingStore: TrackingStore;
  summaryStore: SummaryStore;
  sessions: SessionModels;
  settings(): TrackerSettings;
  ui: TrackerUi;
  newConversation(): Promise<void>;
  /** vscode.l10n.t compatible: `{0}` placeholders. */
  t(message: string, ...args: Array<string | number>): string;
  log?(message: string): void;
  now?(): Date;
}

export type PassiveReason = "settingsUnreadable";

export const MODEL_LABEL: Readonly<Record<Model, string>> = { haiku: "Haiku", sonnet: "Sonnet", opus: "Opus" };

export class Tracker {
  private readonly listeners = new Set<() => void>();
  private server: HookServer | undefined;
  private lastFeatureDir: string | undefined;
  passiveReason: PassiveReason | undefined;

  constructor(private readonly deps: TrackerDeps) {}

  onDidChange(listener: () => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  activeTracking(): SpecTracking | undefined {
    const feature = this.deps.workspace.activeFeature;
    return feature ? this.deps.trackingStore.get(feature.featureDir) : undefined;
  }

  /** Starts the hook server, registers the hooks and re-applies the active lock (FR-014). */
  async init(): Promise<{ port: number; token: string }> {
    const { trackingStore, t } = this.deps;
    let token = trackingStore.getHookToken();
    if (!token) {
      token = randomBytes(24).toString("hex");
      await trackingStore.setHookToken(token);
    }
    this.server = new HookServer({
      token,
      expansion: (body, signal) => this.handleExpansion(body, signal),
      preModelSwitch: (body, signal) => this.handlePreModelSwitch(body, signal),
      postModelSwitch: (body) => this.deps.sessions.observe(body.session_id, body.to_model),
      timeoutResponse: {
        expansion: {},
        preModelSwitch: preModelSwitchResponse({ kind: "deny", message: t("Tokenomist kept the locked model.") }),
      },
    });
    const port = await this.server.start();
    this.lastFeatureDir = this.deps.workspace.activeFeature?.featureDir;
    await this.updateLocal((doc) => upsertTokenomistHooks(doc, port, token!));
    await this.syncModelKey();
    this.emit();
    return { port, token };
  }

  async dispose(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
    this.listeners.clear();
  }

  async onFeatureChanged(feature: ActiveFeature | undefined): Promise<void> {
    const { trackingStore } = this.deps;
    const previous = this.lastFeatureDir ? trackingStore.get(this.lastFeatureDir) : undefined;
    this.lastFeatureDir = feature?.featureDir;
    if (previous && previous.state !== "suspended") {
      await this.saveTransition(previous, { type: "suspend" });
      if (previous.original) {
        const original = previous.original.localModel;
        await this.updateLocal((doc) => restoreModel(doc, original), { modelKey: true });
      }
    }
    const next = feature ? trackingStore.get(feature.featureDir) : undefined;
    if (next?.state === "suspended") {
      await this.saveTransition(next, { type: "resume" });
      await this.syncModelKey();
    }
    this.emit();
  }

  /** FR-004: re-analyse while the feature has no plan yet; a lock is never changed by this. */
  async onSpecSaved(feature: ActiveFeature): Promise<void> {
    if (feature.featureDir !== this.deps.workspace.activeFeature?.featureDir) {
      return;
    }
    const existing = this.deps.trackingStore.get(feature.featureDir);
    if (!existing && (await this.deps.workspace.hasPlan(feature))) {
      return;
    }
    await this.analyze(feature, { notify: true });
  }

  /** `tokenomist.analyzeSpec`: analyse on demand, plan or not (FR-024). */
  async analyzeActive(): Promise<SpecAnalysis | undefined> {
    const feature = this.deps.workspace.activeFeature;
    return feature ? this.analyze(feature, { notify: false }) : undefined;
  }

  /** `tokenomist.showRecommendation`: a model argument locks without asking (FR-010). */
  async review(model?: Model): Promise<void> {
    const tracking = this.activeTracking();
    if (tracking?.lock && (tracking.state === "locked" || tracking.state === "completionPending")) {
      this.deps.ui.warn(this.deps.t("The model is locked to {0} for this spec.", MODEL_LABEL[tracking.lock.model]));
      return;
    }
    const analysis = tracking?.analysis ?? (await this.analyzeActive());
    const recommended = analysis?.recommendedModel;
    const choice =
      model && isModel(model)
        ? { model, manualOverride: model !== recommended }
        : await this.deps.ui.pickModel(analysis);
    if (choice) {
      await this.lock(choice.model, choice.manualOverride);
    }
  }

  async lock(model: Model, manualOverride: boolean, options: { announce?: boolean } = {}): Promise<boolean> {
    const feature = this.deps.workspace.activeFeature;
    if (!feature) {
      return false;
    }
    const local = await this.readLocalOrWarn();
    if (!local) {
      return false;
    }
    const now = this.nowIso();
    let tracking = this.deps.trackingStore.get(feature.featureDir) ?? (await this.newTracking(feature));
    if (!tracking.original) {
      tracking = {
        ...tracking,
        original: { localModel: takeKeySnapshot(local.doc), createdLocalFile: !local.exists, takenAt: now },
      };
    }
    const next = transition(tracking, { type: "lock" });
    const analysis = tracking.analysis;
    tracking = {
      ...tracking,
      ...(next as object),
      lock: {
        model,
        recommendedModel: analysis?.recommendedModel ?? model,
        level: analysis?.level,
        manualOverride,
        lockedAt: now,
        segments: [{ model, from: now }],
      },
    };
    await this.deps.trackingStore.save(tracking);
    await this.syncModelKey();
    this.emit();
    if (options.announce !== false) {
      this.deps.ui.modelLocked(model);
    }
    return true;
  }

  // ------------------------------------------------------------------ completion (US2)

  /** FR-015: all tasks checked → ask; the spec only finishes on the user's confirmation. */
  async onTasksChanged(feature: ActiveFeature): Promise<void> {
    const tracking = this.deps.trackingStore.get(feature.featureDir);
    if (feature.featureDir !== this.deps.workspace.activeFeature?.featureDir || tracking?.state !== "locked") {
      return;
    }
    const tasks = await this.deps.workspace.readTasks(feature);
    if (tasks === undefined || !isComplete(tasks)) {
      return;
    }
    await this.saveTransition(tracking, { type: "tasksComplete" });
    this.emit();
    await this.askAndFinish();
  }

  /** `tokenomist.finishSpec`: confirm, then finish. */
  async requestFinish(): Promise<void> {
    if (!this.lockedTracking()) {
      this.deps.ui.warn(this.deps.t("There is no locked spec to finish."));
      return;
    }
    await this.askAndFinish();
  }

  /** FR-016, FR-017: restore the original model exactly, then record and show the summary. */
  async finish(): Promise<SpecSummary | undefined> {
    const tracking = this.lockedTracking();
    if (!tracking?.lock) {
      this.deps.ui.warn(this.deps.t("There is no locked spec to finish."));
      return undefined;
    }
    const local = await this.readLocalOrWarn();
    if (!local) {
      return undefined;
    }
    const { settingsStore, trackingStore, summaryStore, workspace } = this.deps;
    const original = tracking.original;
    if (original) {
      await this.updateLocal((doc) => restoreModel(doc, original.localModel), { modelKey: true });
      if (original.createdLocalFile && isEmptySettings((await settingsStore.readLocal()).doc)) {
        await settingsStore.deleteLocal();
      }
      if (original.userModel) {
        await settingsStore.restoreUserModel(original.userModel);
      }
    }
    const completedAt = this.nowIso();
    const segments = tracking.lock.segments;
    const summary: SpecSummary = {
      id: summaryId(workspace.root, tracking.spec.featureDir, completedAt),
      specName: tracking.spec.name,
      workspaceName: path.basename(workspace.root),
      level: tracking.lock.level ?? tracking.analysis?.level ?? "medium",
      recommendedModel: tracking.lock.recommendedModel,
      usedModel: dominantModel(segments, completedAt) ?? tracking.lock.model,
      manualOverride: tracking.lock.manualOverride,
      estimatedSavingsPct: estimateSavings(segments, completedAt),
      startedAt: tracking.startedAt,
      completedAt,
    };
    await summaryStore.add(summary);
    await trackingStore.delete(tracking.spec.featureDir);
    this.emit();
    this.deps.ui.showSummary(summary);
    return summary;
  }

  summaries(): SpecSummary[] {
    return this.deps.summaryStore.list();
  }

  private async askAndFinish(): Promise<void> {
    const tracking = this.lockedTracking();
    if (!tracking) {
      return;
    }
    const answer = await this.deps.ui.askFinish(tracking.spec.name);
    if (answer === "finish") {
      await this.finish();
    } else if (answer === "notYet" && tracking.state === "completionPending") {
      await this.saveTransition(this.lockedTracking()!, { type: "finishDeclined" });
      this.emit();
    }
  }

  private lockedTracking(): SpecTracking | undefined {
    const tracking = this.activeTracking();
    return tracking && (tracking.state === "locked" || tracking.state === "completionPending") ? tracking : undefined;
  }

  // ------------------------------------------------------------------ hook handlers

  private async handleExpansion(body: HookBody, signal: AbortSignal): Promise<Record<string, unknown>> {
    const { ui, t, sessions } = this.deps;
    const tracking = this.activeTracking();
    const decision = decideExpansion(body, await this.gateContext(body, tracking));
    const command = body.command_name ?? "";
    switch (decision.kind) {
      case "allow":
      // The spec-writing phase (FR-003) is handled by US3 (T050).
      case "startWriting":
      case "askWriting":
        return {};
      case "askUnlockedPlan": {
        const ackKey = `unlocked:${this.deps.workspace.activeFeature?.featureDir}`;
        if (sessions.isAcknowledged(body.session_id, ackKey)) {
          return {};
        }
        const recommended = decision.recommendedModel;
        const answer = await ui.askUnlockedPlan(recommended);
        let choice: { model: Model; manualOverride: boolean } | undefined;
        if (answer === "approve" && recommended) {
          choice = { model: recommended, manualOverride: false };
        } else if (answer === "approve" || answer === "change") {
          choice = await ui.pickModel(tracking?.analysis);
        }
        if (!choice) {
          sessions.acknowledge(body.session_id, ackKey);
          return {};
        }
        if (!(await this.lock(choice.model, choice.manualOverride, { announce: false }))) {
          return {};
        }
        return this.blockForNewConversation(
          signal,
          t("Tokenomist locked the model to {0}. Run /{1} again in the new conversation.", MODEL_LABEL[choice.model], command),
        );
      }
      case "askSessionMismatch": {
        const lockKey = this.lockKey(tracking);
        if (sessions.isAcknowledged(body.session_id, lockKey)) {
          return {};
        }
        const answer = await ui.askSessionMismatch(decision.lockedModel);
        if (answer !== "newConversation") {
          sessions.acknowledge(body.session_id, lockKey);
          return {};
        }
        return this.blockForNewConversation(
          signal,
          t(
            "This conversation may not use the locked model {0}. Run /{1} again in the new conversation.",
            MODEL_LABEL[decision.lockedModel],
            command,
          ),
        );
      }
    }
  }

  private async handlePreModelSwitch(body: HookBody, signal: AbortSignal): Promise<Record<string, unknown>> {
    const { ui, t, sessions, trackingStore, settingsStore } = this.deps;
    sessions.observe(body.session_id, body.from_model);
    const tracking = this.activeTracking();
    const decision = decidePreModelSwitch(body, await this.gateContext(body, tracking));
    if (decision.kind === "allow") {
      return preModelSwitchResponse({ kind: "allow" });
    }
    const keep = preModelSwitchResponse({
      kind: "deny",
      message: t("Tokenomist kept the locked model {0}.", MODEL_LABEL[decision.lockedModel]),
    });
    const answer = await ui.askOverride(decision.lockedModel, decision.targetModel);
    if (signal.aborted || answer !== "update" || !decision.targetModel || !tracking?.lock) {
      return keep;
    }
    const target = decision.targetModel;
    const now = this.nowIso();
    const original = tracking.original!;
    const segments = tracking.lock.segments.map((s) => (s.to ? s : { ...s, to: now }));
    await trackingStore.save({
      ...tracking,
      original:
        decision.persistsToUserSettings && !original.userModel
          ? { ...original, userModel: await settingsStore.readUserModel() }
          : original,
      lock: { ...tracking.lock, model: target, manualOverride: true, segments: [...segments, { model: target, from: now }] },
    });
    sessions.observe(body.session_id, body.to_model);
    await this.syncModelKey();
    this.emit();
    return preModelSwitchResponse({ kind: "allow" });
  }

  private async blockForNewConversation(signal: AbortSignal, reason: string): Promise<Record<string, unknown>> {
    if (!signal.aborted) {
      await this.deps.newConversation().catch((err) => this.deps.log?.(`newConversation failed: ${err}`));
    }
    return expansionResponse({ kind: "block", reason });
  }

  private async gateContext(body: HookBody, tracking: SpecTracking | undefined): Promise<GateContext> {
    const local = await this.deps.settingsStore.readLocal().catch(() => undefined);
    const keyModel = modelFamily(typeof local?.doc.model === "string" ? local.doc.model : undefined);
    const sessionModel = resolveSessionModel({
      observed: this.deps.sessions.observed(body.session_id),
      sessionStartedAt: await transcriptCreatedAt(body.transcript_path),
      keyWrittenAt: this.deps.trackingStore.getKeyWrittenAt(),
      keyModel: isModel(local?.doc.model) ? keyModel : undefined,
    });
    return {
      workspaceRoot: this.deps.workspace.root,
      writingModel: this.deps.settings().writingModel,
      sessionModel,
      tracking: tracking && {
        state: tracking.state,
        lockedModel: tracking.lock?.model,
        recommendedModel: tracking.analysis?.recommendedModel,
      },
    };
  }

  private lockKey(tracking: SpecTracking | undefined): string {
    return `${tracking?.spec.featureDir}:${tracking?.lock?.lockedAt}:${tracking?.lock?.model}`;
  }

  // ------------------------------------------------------------------ analysis

  private async analyze(feature: ActiveFeature, options: { notify: boolean }): Promise<SpecAnalysis | undefined> {
    const text = await this.deps.workspace.readSpec(feature);
    const result = text === undefined ? undefined : analyzeText(text);
    if (!result) {
      return undefined;
    }
    const { mode, thresholds } = this.deps.settings();
    const rec = recommend(result.score, mode, thresholds);
    const specHash = createHash("sha256").update(text!).digest("hex");
    let tracking = this.deps.trackingStore.get(feature.featureDir) ?? (await this.newTracking(feature, text));
    const unchanged =
      tracking.analysis?.specHash === specHash && tracking.analysis.recommendedModel === rec.model;
    const analysis: SpecAnalysis = {
      spec: { ...tracking.spec, name: specName(text!, feature.featureDir) },
      specHash,
      signals: result.signals,
      score: result.score,
      level: rec.level,
      borderlineBumped: rec.borderlineBumped,
      recommendedModel: rec.model,
      reasons: result.reasons,
      analyzedAt: this.nowIso(),
    };
    tracking = { ...tracking, spec: analysis.spec, analysis };
    if (tracking.state !== "suspended") {
      tracking = { ...tracking, ...(transition(tracking, { type: "specSaved" }) as object) };
    }
    await this.deps.trackingStore.save(tracking);
    this.emit();
    if (options.notify && !unchanged && tracking.state === "awaitingApproval") {
      this.deps.ui.recommendationReady(analysis);
    }
    return analysis;
  }

  private async newTracking(feature: ActiveFeature, specText?: string): Promise<SpecTracking> {
    const text = specText ?? (await this.deps.workspace.readSpec(feature)) ?? "";
    return {
      spec: { workspaceRoot: this.deps.workspace.root, featureDir: feature.featureDir, name: specName(text, feature.featureDir) },
      state: "awaitingApproval",
      startedAt: this.nowIso(),
    };
  }

  private async saveTransition(tracking: SpecTracking, event: TrackingEvent): Promise<void> {
    const next = transition(tracking, event);
    if (next !== "completed") {
      const { resumeState: _dropped, ...rest } = tracking;
      await this.deps.trackingStore.save({ ...rest, ...next });
    }
  }

  // ------------------------------------------------------------------ Claude Code settings

  /** Makes the local `model` key match what the active tracking record wants. */
  private async syncModelKey(): Promise<void> {
    const tracking = this.activeTracking();
    if (!tracking || !managesModelKey(tracking.state)) {
      return;
    }
    const wanted =
      (tracking.state === "locked" || tracking.state === "completionPending") && tracking.lock
        ? tracking.lock.model
        : tracking.writingModel;
    const original = tracking.original?.localModel;
    if (!wanted && !original) {
      return;
    }
    await this.updateLocal((doc) => (wanted ? applyModel(doc, wanted) : restoreModel(doc, original!)), { modelKey: true });
  }

  private async updateLocal(change: (doc: SettingsDoc) => SettingsDoc, options: { modelKey?: boolean } = {}): Promise<void> {
    const local = await this.readLocalOrWarn();
    if (!local) {
      return;
    }
    const next = change(local.doc);
    if (JSON.stringify(next) === JSON.stringify(local.doc)) {
      return;
    }
    await this.deps.settingsStore.writeLocal(next);
    if (options.modelKey && next.model !== local.doc.model) {
      await this.deps.trackingStore.setKeyWrittenAt((this.deps.now?.() ?? new Date()).getTime());
    }
  }

  private async readLocalOrWarn(): Promise<{ doc: SettingsDoc; exists: boolean } | undefined> {
    try {
      const local = await this.deps.settingsStore.readLocal();
      if (this.passiveReason === "settingsUnreadable") {
        this.passiveReason = undefined;
        this.emit();
      }
      return local;
    } catch (err) {
      if (!(err instanceof SettingsParseError)) {
        throw err;
      }
      if (this.passiveReason !== "settingsUnreadable") {
        this.passiveReason = "settingsUnreadable";
        this.deps.ui.warn(
          this.deps.t(
            "Tokenomist cannot read {0}; it will not change Claude Code settings until the file is valid JSON.",
            path.join(".claude", "settings.local.json"),
          ),
        );
        this.emit();
      }
      return undefined;
    }
  }

  private nowIso(): string {
    return (this.deps.now?.() ?? new Date()).toISOString();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function specName(text: string, featureDir: string): string {
  const title = /^#\s+Feature Specification:\s*(.+)$/m.exec(text)?.[1]?.trim();
  return title || featureDir.split("/").pop() || featureDir;
}

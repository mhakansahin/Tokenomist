// Shared fixtures for node-based integration tests: a temp Spec Kit workspace and fakes for the UI.
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { request } from "node:http";
import { Tracker, TrackerDeps, TrackerSettings, TrackerUi, WorkspaceView } from "../../src/app/tracker";
import { ClaudeSettingsStore } from "../../src/app/claudeSettingsStore";
import { SessionModels } from "../../src/app/sessionModels";
import { MementoLike, TrackingStore } from "../../src/persistence/trackingStore";
import { DEFAULT_THRESHOLDS } from "../../src/domain/classification";
import { Model, SpecAnalysis, SpecSummary } from "../../src/domain/types";
import { SummaryStore } from "../../src/persistence/summaryStore";
import { RestoreLedger } from "../../src/app/restoreLedger";
import { SkillModelStore } from "../../src/app/skillModelStore";

export const COMPLEX_SPEC = path.resolve(__dirname, "../../../tests/fixtures/specs/complex/realtime-chat.md");

export class MemoryMemento implements MementoLike {
  private readonly data = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }
  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.data.delete(key);
    } else {
      this.data.set(key, structuredClone(value));
    }
  }
}

export class FakeWorkspace implements WorkspaceView {
  activeFeature: { featureDir: string; absoluteDir: string } | undefined;
  constructor(readonly root: string) {}
  async setActive(featureDir: string | undefined): Promise<void> {
    this.activeFeature = featureDir ? { featureDir, absoluteDir: path.join(this.root, featureDir) } : undefined;
    if (featureDir) {
      await fs.mkdir(this.activeFeature!.absoluteDir, { recursive: true });
    }
  }
  async readSpec(feature = this.activeFeature): Promise<string | undefined> {
    return feature ? fs.readFile(path.join(feature.absoluteDir, "spec.md"), "utf8").catch(() => undefined) : undefined;
  }
  async readTasks(feature = this.activeFeature): Promise<string | undefined> {
    return feature ? fs.readFile(path.join(feature.absoluteDir, "tasks.md"), "utf8").catch(() => undefined) : undefined;
  }
  async hasPlan(feature = this.activeFeature): Promise<boolean> {
    return feature ? fs.stat(path.join(feature.absoluteDir, "plan.md")).then(() => true, () => false) : false;
  }
  async writeSpec(content: string): Promise<void> {
    await fs.writeFile(path.join(this.activeFeature!.absoluteDir, "spec.md"), content);
  }
}

export class FakeUi implements TrackerUi {
  readonly calls: string[] = [];
  recommendations: SpecAnalysis[] = [];
  pick: { model: Model; manualOverride: boolean } | undefined;
  unlockedPlanAnswer: Awaited<ReturnType<TrackerUi["askUnlockedPlan"]>> = "approve";
  mismatchAnswer: Awaited<ReturnType<TrackerUi["askSessionMismatch"]>> = "newConversation";
  overrideAnswer: Awaited<ReturnType<TrackerUi["askOverride"]>> = "revert";
  finishAnswer: Awaited<ReturnType<TrackerUi["askFinish"]>> = "finish";
  writingAnswer: Awaited<ReturnType<TrackerUi["askWriting"]>> = "continue";
  confirmCleanupAnswer = true;
  recommendationReady(analysis: SpecAnalysis): void {
    this.calls.push(`recommendationReady:${analysis.recommendedModel}`);
    this.recommendations.push(analysis);
  }
  async pickModel(): Promise<{ model: Model; manualOverride: boolean } | undefined> {
    this.calls.push("pickModel");
    return this.pick;
  }
  modelLocked(model: Model): void {
    this.calls.push(`modelLocked:${model}`);
  }
  async askUnlockedPlan(recommended: Model | undefined) {
    this.calls.push(`askUnlockedPlan:${recommended}`);
    return this.unlockedPlanAnswer;
  }
  async askSessionMismatch(locked: Model) {
    this.calls.push(`askSessionMismatch:${locked}`);
    return this.mismatchAnswer;
  }
  async askOverride(locked: Model, target: Model | undefined) {
    this.calls.push(`askOverride:${locked}->${target}`);
    return this.overrideAnswer;
  }
  async askWriting(model: Model) {
    this.calls.push(`askWriting:${model}`);
    return this.writingAnswer;
  }
  async askFinish() {
    this.calls.push("askFinish");
    return this.finishAnswer;
  }
  showSummary(summary: SpecSummary): void {
    this.calls.push(`showSummary:${summary.usedModel}`);
  }
  autoLocked(model: string): void {
    this.calls.push(`autoLocked:${model}`);
  }
  creditsWarning(value: string): void {
    this.calls.push(`creditsWarning:${value}`);
  }
  async confirmCleanup() {
    this.calls.push("confirmCleanup");
    return this.confirmCleanupAnswer;
  }
  info(message: string): void {
    this.calls.push(`info:${message}`);
  }
  warn(message: string): void {
    this.calls.push(`warn:${message}`);
  }
}

export async function setup(options: { localSettings?: unknown } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-it-"));
  await fs.mkdir(path.join(root, ".git", "info"), { recursive: true });
  if (options.localSettings !== undefined) {
    await fs.mkdir(path.join(root, ".claude"), { recursive: true });
    await fs.writeFile(path.join(root, ".claude", "settings.local.json"), JSON.stringify(options.localSettings));
  }
  const workspace = new FakeWorkspace(root);
  await workspace.setActive("specs/001-chat");
  await workspace.writeSpec(await fs.readFile(COMPLEX_SPEC, "utf8"));
  const memento = new MemoryMemento();
  const globalMemento = new MemoryMemento();
  const ledger = new RestoreLedger(path.join(root, ".tokenomist-global", "restore-ledger.json"));
  const ui = new FakeUi();
  /** Prompts the tracker asked to prefill in new conversations (004). */
  const newConversations: string[] = [];
  const prefillWorks = { value: true };
  const settingsStore = new ClaudeSettingsStore(root, path.join(root, "user-settings.json"));
  // "ask" keeps the 001/002 flows unchanged in these tests (004 SC-003); the product default is "auto".
  const settings: TrackerSettings = {
    mode: "balanced",
    thresholds: { ...DEFAULT_THRESHOLDS },
    writingModel: "sonnet",
    custom: {},
    automation: "ask",
    // "new" keeps the 004 flows unchanged in these tests (005 SC-004); the product default is "same".
    conversation: "new",
  };
  const makeTracker = (overrides: Partial<TrackerDeps> = {}) =>
    new Tracker({
      workspace,
      settingsStore,
      trackingStore: new TrackingStore(memento),
      summaryStore: new SummaryStore(globalMemento),
      ledger,
      skills: new SkillModelStore(root, ledger),
      sessions: new SessionModels(),
      settings: () => settings,
      ui,
      newConversation: async (prompt?: string) => {
        newConversations.push(prompt ?? "");
        return prompt !== undefined && prefillWorks.value;
      },
      t: (message, ...args) => message.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)])),
      ...overrides,
    });
  return { root, workspace, memento, ui, newConversations, prefillWorks, settingsStore, settings, ledger, makeTracker };
}

export async function readLocal(root: string): Promise<Record<string, unknown> | undefined> {
  const text = await fs.readFile(path.join(root, ".claude", "settings.local.json"), "utf8").catch(() => undefined);
  return text === undefined ? undefined : JSON.parse(text);
}

export function post(port: number, urlPath: string, body: unknown, token: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port, path: urlPath, method: "POST", headers: { "X-Tokenomist-Token": token } },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve(JSON.parse(text)));
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

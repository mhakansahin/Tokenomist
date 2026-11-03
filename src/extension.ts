import * as path from "node:path";
import * as vscode from "vscode";
import { CLAUDE_CODE_EXTENSION_ID, Detection, detect, readManagedSettings } from "./app/claudeDetector";
import { ClaudeSettingsStore } from "./app/claudeSettingsStore";
import { LEDGER_FILE, RestoreLedger } from "./app/restoreLedger";
import { SessionModels } from "./app/sessionModels";
import { SpecKitWatcher } from "./app/specKitWatcher";
import { Tracker, TrackerSettings } from "./app/tracker";
import { DEFAULT_THRESHOLDS, Thresholds, writingModelFor } from "./domain/classification";
import { resolveMode, resolveThresholds, ThresholdError } from "./domain/settingsValidation";
import { isModel } from "./domain/types";
import { SummaryStore } from "./persistence/summaryStore";
import { TrackingStore } from "./persistence/trackingStore";
import { askOverride, askSessionMismatch, askUnlockedPlan, askWriting, confirmCleanup } from "./ui/gatePrompts";
import { announceLock, announceRecommendation, pickModel } from "./ui/recommendation";
import { passiveExplanation, PassiveCause, SHOW_STATUS_COMMAND, StatusBar } from "./ui/statusBar";
import { openSetup } from "./ui/setup";
import { askFinish, showSummaries, showSummary } from "./ui/summaries";

const NEW_CONVERSATION_COMMAND = "claude-vscode.newConversation";

/** Returned from activate for integration tests. */
export interface TokenomistApi {
  tracker: Tracker | undefined;
  status: StatusBar;
  onboardingOffered: boolean;
}

const ONBOARDED_KEY = "tokenomist.onboarded";

let output: vscode.OutputChannel | undefined;
let tracker: Tracker | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<TokenomistApi> {
  output = vscode.window.createOutputChannel("Tokenomist");
  const status = new StatusBar();
  context.subscriptions.push(output, status);
  const api: TokenomistApi = { tracker: undefined, status, onboardingOffered: false };

  context.subscriptions.push(
    vscode.commands.registerCommand(SHOW_STATUS_COMMAND, () => {
      const cause = status.current.passive;
      if (cause) {
        void vscode.window.showInformationMessage(passiveExplanation(cause));
      }
    }),
    vscode.commands.registerCommand("tokenomist.analyzeSpec", async () => {
      if (!tracker) {
        return explainPassive(status.current.passive);
      }
      const analysis = await tracker.analyzeActive();
      if (!analysis) {
        void vscode.window.showWarningMessage(vscode.l10n.t("The active spec could not be analysed."));
        return;
      }
      await tracker.review();
    }),
    vscode.commands.registerCommand("tokenomist.showRecommendation", async (model?: unknown) => {
      if (!tracker) {
        return explainPassive(status.current.passive);
      }
      await tracker.review(isModel(model) ? model : undefined);
    }),
    vscode.commands.registerCommand("tokenomist.finishSpec", async () => {
      if (!tracker) {
        return explainPassive(status.current.passive);
      }
      await tracker.requestFinish();
    }),
    // Summaries live in globalState, so they are available even in passive workspaces (FR-019).
    vscode.commands.registerCommand("tokenomist.showSummaries", () =>
      showSummaries(new SummaryStore(context.globalState).list()),
    ),
    vscode.commands.registerCommand("tokenomist.openSetup", openSetup),
    vscode.commands.registerCommand("tokenomist.cleanClaudeSettings", async () => {
      if (!tracker) {
        return explainPassive(status.current.passive);
      }
      await tracker.cleanClaudeSettings();
    }),
  );

  const passive = (cause: PassiveCause) => {
    status.render({ passive: cause });
    log(`Passive: ${cause}`);
    return api;
  };

  const detection = await detectClaudeCode();
  log(`Claude Code: installed=${detection.installed} overriddenBy=${detection.overriddenBy ?? "none"}`);
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return passive("noSpecKit");
  }
  const watcher = new SpecKitWatcher(folder);
  context.subscriptions.push(watcher);
  if (!detection.installed) {
    const install = vscode.l10n.t("Find Claude Code");
    void vscode.window.showWarningMessage(passiveExplanation("claudeMissing"), install).then((choice) => {
      if (choice === install) {
        void vscode.commands.executeCommand("workbench.extensions.search", CLAUDE_CODE_EXTENSION_ID);
      }
    });
    return passive("claudeMissing");
  }
  if (detection.overriddenBy) {
    return passive("modelOverridden");
  }
  if (!(await watcher.isSpecKitWorkspace())) {
    return passive("noSpecKit");
  }
  await watcher.start();

  const sessions = new SessionModels();
  const startNewConversation = async () => {
    await vscode.commands.executeCommand(NEW_CONVERSATION_COMMAND);
  };
  tracker = new Tracker({
    workspace: watcher,
    settingsStore: new ClaudeSettingsStore(folder.uri.fsPath),
    trackingStore: new TrackingStore(context.workspaceState),
    summaryStore: new SummaryStore(context.globalState),
    ledger: new RestoreLedger(path.join(context.globalStorageUri.fsPath, LEDGER_FILE)),
    sessions,
    settings: readSettings,
    ui: {
      recommendationReady: announceRecommendation,
      pickModel,
      modelLocked: (model) => announceLock(model, startNewConversation),
      askUnlockedPlan,
      askSessionMismatch,
      askOverride,
      askWriting,
      askFinish,
      showSummary,
      confirmCleanup,
      info: (message) => void vscode.window.showInformationMessage(message),
      warn: (message) => void vscode.window.showWarningMessage(message),
    },
    newConversation: startNewConversation,
    t: (message, ...args) => vscode.l10n.t(message, ...args),
    log,
  });
  api.tracker = tracker;

  let gateOffline = false;
  const render = () =>
    status.render({
      passive: tracker?.passiveReason === "settingsUnreadable" ? "settingsUnreadable" : undefined,
      gateOffline,
      tracking: tracker?.activeTracking(),
      pendingWritingModel: tracker?.pendingWriting()?.writingModel,
    });
  context.subscriptions.push(
    tracker.onDidChange(render),
    watcher.onFeatureChanged((feature) => void tracker?.onFeatureChanged(feature)),
    watcher.onSpecSaved((feature) => void tracker?.onSpecSaved(feature)),
    watcher.onTasksChanged((feature) => void tracker?.onTasksChanged(feature)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tokenomist")) {
        readSettings({ warn: true });
        void tracker?.onSettingsChanged();
      }
    }),
  );
  try {
    const { port } = await tracker.init();
    log(`Hook server listening on 127.0.0.1:${port}`);
  } catch (err) {
    gateOffline = true;
    log(`Hook server failed to start: ${err}`);
  }
  render();
  log(`Active feature: ${watcher.activeFeature?.featureDir ?? "none"}`);
  api.onboardingOffered = await offerOnboarding(context);
  return api;
}

export async function deactivate(): Promise<void> {
  await tracker?.dispose();
  tracker = undefined;
  output = undefined;
}

export async function detectClaudeCode(): Promise<Detection> {
  return detect({
    extensionInstalled:
      vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID) !== undefined ||
      process.env.TOKENOMIST_ASSUME_CLAUDE_CODE === "1",
    env: process.env,
    extensionEnv: vscode.workspace.getConfiguration("claudeCode").get("environmentVariables"),
    managedSettingsText: await readManagedSettings(),
  });
}

let lastValidThresholds: Thresholds = { ...DEFAULT_THRESHOLDS };

/** FR-020, FR-021, FR-003: invalid thresholds are reported and the last valid ones stay in use. */
function readSettings(options: { warn?: boolean } = {}): TrackerSettings {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const mode = resolveMode(config.get("mode"));
  const { thresholds, errors } = resolveThresholds(
    { medium: config.get("thresholds.medium"), complex: config.get("thresholds.complex"), margin: config.get("borderlineMargin") },
    lastValidThresholds,
  );
  if (errors.length === 0) {
    lastValidThresholds = thresholds;
  } else if (options.warn) {
    void vscode.window.showErrorMessage(errors.map(thresholdErrorText).join(" "));
  }
  return { mode, thresholds, writingModel: writingModelFor(mode, config.get<boolean>("writingModel.followMode") === true) };
}

function thresholdErrorText(error: ThresholdError): string {
  switch (error) {
    case "mediumRange":
      return vscode.l10n.t("The medium threshold must be between 1 and 98.");
    case "complexRange":
      return vscode.l10n.t("The complex threshold must be between 2 and 99.");
    case "marginRange":
      return vscode.l10n.t("The borderline margin must be between 0 and 20.");
    case "order":
      return vscode.l10n.t("The medium threshold must be lower than the complex threshold. The previous values stay in use.");
  }
}

/** US4: the first time Tokenomist can work, suggest choosing a mode. */
async function offerOnboarding(context: vscode.ExtensionContext): Promise<boolean> {
  if (context.globalState.get<boolean>(ONBOARDED_KEY)) {
    return false;
  }
  await context.globalState.update(ONBOARDED_KEY, true);
  const setup = vscode.l10n.t("Open setup");
  void vscode.window
    .showInformationMessage(
      vscode.l10n.t("Tokenomist is ready: it picks Haiku, Sonnet or Opus per spec. Choose a mode?"),
      setup,
    )
    .then((choice) => {
      if (choice === setup) {
        void vscode.commands.executeCommand("tokenomist.openSetup");
      }
    });
  return true;
}

function explainPassive(cause: PassiveCause | undefined): void {
  if (cause) {
    void vscode.window.showInformationMessage(passiveExplanation(cause));
  }
}

function log(message: string): void {
  output?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

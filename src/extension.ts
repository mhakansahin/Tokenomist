import * as vscode from "vscode";
import { CLAUDE_CODE_EXTENSION_ID, Detection, detect, readManagedSettings } from "./app/claudeDetector";
import { ClaudeSettingsStore } from "./app/claudeSettingsStore";
import { SessionModels } from "./app/sessionModels";
import { SpecKitWatcher } from "./app/specKitWatcher";
import { Tracker, TrackerSettings } from "./app/tracker";
import { DEFAULT_THRESHOLDS } from "./domain/classification";
import { isModel, Mode, MODES } from "./domain/types";
import { SummaryStore } from "./persistence/summaryStore";
import { TrackingStore } from "./persistence/trackingStore";
import { askOverride, askSessionMismatch, askUnlockedPlan } from "./ui/gatePrompts";
import { announceLock, announceRecommendation, pickModel } from "./ui/recommendation";
import { passiveExplanation, PassiveCause, SHOW_STATUS_COMMAND, StatusBar } from "./ui/statusBar";
import { askFinish, showSummaries, showSummary } from "./ui/summaries";

const NEW_CONVERSATION_COMMAND = "claude-vscode.newConversation";

/** Returned from activate for integration tests. */
export interface TokenomistApi {
  tracker: Tracker | undefined;
  status: StatusBar;
}

let output: vscode.OutputChannel | undefined;
let tracker: Tracker | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<TokenomistApi> {
  output = vscode.window.createOutputChannel("Tokenomist");
  const status = new StatusBar();
  context.subscriptions.push(output, status);
  const api: TokenomistApi = { tracker: undefined, status };

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
    void vscode.window.showWarningMessage(passiveExplanation("claudeMissing"));
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
    sessions,
    settings: readSettings,
    ui: {
      recommendationReady: announceRecommendation,
      pickModel,
      modelLocked: (model) => announceLock(model, startNewConversation),
      askUnlockedPlan,
      askSessionMismatch,
      askOverride,
      askFinish,
      showSummary,
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
    });
  context.subscriptions.push(
    tracker.onDidChange(render),
    watcher.onFeatureChanged((feature) => void tracker?.onFeatureChanged(feature)),
    watcher.onSpecSaved((feature) => void tracker?.onSpecSaved(feature)),
    watcher.onTasksChanged((feature) => void tracker?.onTasksChanged(feature)),
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

/** Mode and thresholds; full validation and the writing model arrive with US3 (T048–T050). */
function readSettings(): TrackerSettings {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const mode = config.get<string>("mode");
  return {
    mode: (MODES as readonly string[]).includes(mode ?? "") ? (mode as Mode) : "balanced",
    thresholds: { ...DEFAULT_THRESHOLDS },
    writingModel: "sonnet",
  };
}

function explainPassive(cause: PassiveCause | undefined): void {
  if (cause) {
    void vscode.window.showInformationMessage(passiveExplanation(cause));
  }
}

function log(message: string): void {
  output?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

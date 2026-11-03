import * as vscode from "vscode";
import { CLAUDE_CODE_EXTENSION_ID, Detection, detect, readManagedSettings } from "./app/claudeDetector";
import { SpecKitWatcher } from "./app/specKitWatcher";

let output: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  output = vscode.window.createOutputChannel("Tokenomist");
  context.subscriptions.push(output);

  const detection = await detectClaudeCode();
  log(`Claude Code: installed=${detection.installed} overriddenBy=${detection.overriddenBy ?? "none"}`);

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    log("No workspace folder; passive.");
    return;
  }
  const watcher = new SpecKitWatcher(folder);
  context.subscriptions.push(watcher);
  if (!(await watcher.isSpecKitWorkspace())) {
    log("No .specify/feature.json; passive.");
    return;
  }
  await watcher.start();
  log(`Active feature: ${watcher.activeFeature?.featureDir ?? "none"}`);

  if (!detection.installed || detection.overriddenBy) {
    log("Passive: Tokenomist will not write Claude Code settings.");
    return;
  }
}

export function deactivate(): void {
  output = undefined;
}

export async function detectClaudeCode(): Promise<Detection> {
  return detect({
    extensionInstalled: vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID) !== undefined,
    env: process.env,
    extensionEnv: vscode.workspace.getConfiguration("claudeCode").get("environmentVariables"),
    managedSettingsText: await readManagedSettings(),
  });
}

function log(message: string): void {
  output?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

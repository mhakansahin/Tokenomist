// US4 activation scenarios, one VS Code launch each (FR-001, research.md R6, Edge Cases).
// runTests.ts picks the scenario through TOKENOMIST_SCENARIO.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TokenomistApi } from "../../../src/extension";

export type Scenario = "claudeMissing" | "modelOverridden" | "noSpecKit";

export async function runActivationScenario(scenario: Scenario): Promise<void> {
  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "tokenomist");
  assert.ok(ext, "extension is loaded");
  const api = (await ext.activate()) as TokenomistApi;
  assert.equal(api.tracker, undefined, "no tracker in a passive workspace");
  assert.equal(api.status.current.passive, scenario);
  assert.equal(api.onboardingOffered, false, "setup is only offered when Tokenomist can work");

  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  await assert.rejects(fs.stat(path.join(root, ".claude", "settings.local.json")), "nothing is written");

  // Commands still answer instead of failing.
  await vscode.commands.executeCommand("tokenomist.analyzeSpec");
  await assert.rejects(fs.stat(path.join(root, ".claude", "settings.local.json")));
}

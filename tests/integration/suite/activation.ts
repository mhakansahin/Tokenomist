// US4 activation scenarios, one VS Code launch each (FR-001, research.md R6, Edge Cases).
// runTests.ts picks the scenario through TOKENOMIST_SCENARIO.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TokenomistApi } from "../../../src/extension";

export type Scenario = "claudeMissing" | "modelOverridden" | "noSpecKit" | "freshSpecKit" | "lateSpecKit";

export async function runActivationScenario(scenario: Scenario): Promise<void> {
  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "tokenomist");
  assert.ok(ext, "extension is loaded");
  const api = (await ext.activate()) as TokenomistApi;
  if (scenario === "freshSpecKit") {
    return freshSpecKit(api);
  }
  if (scenario === "lateSpecKit") {
    return lateSpecKit(api);
  }
  assert.equal(api.tracker, undefined, "no tracker in a passive workspace");
  assert.equal(api.status.current.passive, scenario);
  assert.equal(api.onboardingOffered, false, "setup is only offered when Tokenomist can work");

  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  await assert.rejects(fs.stat(path.join(root, ".claude", "settings.local.json")), "nothing is written");

  // Commands still answer instead of failing.
  await vscode.commands.executeCommand("tokenomist.analyzeSpec");
  await assert.rejects(fs.stat(path.join(root, ".claude", "settings.local.json")));
}

/** Polls until `check` passes or the timeout (SC-003: 5 s) runs out. */
async function eventually(check: () => boolean | Promise<boolean>, what: string, timeoutMs = 5000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await check()) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail(`timed out waiting for: ${what}`);
}

async function readHooks(root: string): Promise<unknown> {
  const text = await fs.readFile(path.join(root, ".claude", "settings.local.json"), "utf8").catch(() => "{}");
  return (JSON.parse(text) as { hooks?: unknown }).hooks;
}

/** 003 US1: Spec Kit installed but no feature yet (FR-001, FR-002, FR-004, SC-001, SC-003). */
async function freshSpecKit(api: TokenomistApi): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  assert.ok(api.tracker, "tracker runs without .specify/feature.json");
  assert.equal(api.status.current.passive, undefined, "not passive");
  assert.equal(api.status.current.noFeature, true, "shows 'no spec yet'");
  assert.ok(await readHooks(root), "hooks installed");

  const featureDir = path.join(root, "specs", "001-demo");
  await fs.mkdir(featureDir, { recursive: true });
  await fs.writeFile(path.join(featureDir, "spec.md"), "# Feature Specification: Demo\n### User Story 1 - A\n- **FR-001**: one\n");
  await fs.writeFile(path.join(root, ".specify", "feature.json"), JSON.stringify({ feature_directory: "specs/001-demo" }));
  await eventually(() => api.tracker!.activeTracking()?.analysis !== undefined, "the new feature is tracked and analysed");
}

/** 003 US2: Spec Kit installed while VS Code is open (FR-005, SC-003). */
async function lateSpecKit(api: TokenomistApi): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  assert.equal(api.status.current.passive, "noSpecKit");
  await fs.mkdir(path.join(root, ".specify", "memory"), { recursive: true });
  await fs.writeFile(path.join(root, ".specify", "memory", "constitution.md"), "# Constitution\n");
  await eventually(() => api.tracker !== undefined && api.status.current.passive === undefined, "Tokenomist activates");
  await eventually(async () => (await readHooks(root)) !== undefined, "hooks installed");
}

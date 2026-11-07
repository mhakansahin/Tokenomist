// Smoke tests inside a real VS Code instance (US1 activation and commands). A tiny sequential runner
// keeps the dev dependencies to the ones in the constitution.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TokenomistApi } from "../../../src/extension";
import { runActivationScenario, Scenario } from "./activation";

const cases: Array<[string, () => Promise<void>]> = [];
const it = (name: string, fn: () => Promise<void>) => cases.push([name, fn]);

function workspaceRoot(): string {
  return vscode.workspace.workspaceFolders![0].uri.fsPath;
}

async function api(): Promise<TokenomistApi> {
  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "tokenomist");
  assert.ok(ext, "extension is loaded");
  return (await ext.activate()) as TokenomistApi;
}

it("activates in a Spec Kit workspace, offers setup once and registers its commands", async () => {
  const { tracker, onboardingOffered } = await api();
  assert.ok(tracker, "tracker is running (not passive)");
  assert.equal(onboardingOffered, true, "first activation offers the setup (US4)");
  const commands = await vscode.commands.getCommands(true);
  for (const id of ["tokenomist.analyzeSpec", "tokenomist.showRecommendation", "tokenomist.finishSpec", "tokenomist.showSummaries", "tokenomist.openSetup"]) {
    assert.ok(commands.includes(id), id);
  }
});

it("locks a model through the command and writes the local Claude Code setting", async () => {
  const { tracker } = await api();
  await tracker!.analyzeActive();
  assert.equal(tracker!.activeTracking()?.state, "awaitingApproval");
  await vscode.commands.executeCommand("tokenomist.showRecommendation", "opus");
  assert.equal(tracker!.activeTracking()?.state, "locked");
  const local = JSON.parse(await fs.readFile(path.join(workspaceRoot(), ".claude", "settings.local.json"), "utf8"));
  assert.equal(local.model, "opus");
  assert.ok(local.hooks.UserPromptExpansion, "hooks registered");
});

it("finishing restores the original (absent) model and records a summary", async () => {
  const { tracker } = await api();
  const summary = await tracker!.finish();
  assert.equal(summary?.usedModel, "opus");
  const local = JSON.parse(await fs.readFile(path.join(workspaceRoot(), ".claude", "settings.local.json"), "utf8"));
  assert.equal(local.model, undefined);
  assert.equal(tracker!.activeTracking(), undefined);
});

it("002: custom mode cells from VS Code settings drive the recommendation", async () => {
  const { tracker } = await api();
  const config = vscode.workspace.getConfiguration("tokenomist");
  await config.update("mode", "custom", vscode.ConfigurationTarget.Global);
  await config.update("custom.medium", " OpusPlan ", vscode.ConfigurationTarget.Global);
  try {
    const analysis = await tracker!.analyzeActive();
    assert.equal(analysis?.level, "medium", "the fixture spec is medium");
    assert.equal(analysis?.recommendedModel, "opusplan");
  } finally {
    await config.update("custom.medium", undefined, vscode.ConfigurationTarget.Global);
    await config.update("mode", undefined, vscode.ConfigurationTarget.Global);
  }
});

it("004: without Claude Code's commands the new-conversation fallback reports false instead of failing", async () => {
  const tokenomist = await api();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(!commands.includes("claude-vscode.primaryEditor.open"), "the test profile has no Claude Code");
  assert.equal(await tokenomist.newConversation!("/speckit-plan"), false);
});

export async function run(): Promise<void> {
  const scenario = process.env.TOKENOMIST_SCENARIO ?? "main";
  if (scenario !== "main") {
    await runActivationScenario(scenario as Scenario);
    console.log(`ok - activation scenario: ${scenario}`);
    return;
  }
  const failures: string[] = [];
  try {
    for (const [name, fn] of cases) {
      try {
        await fn();
        console.log(`ok - ${name}`);
      } catch (err) {
        failures.push(name);
        console.error(`not ok - ${name}\n${(err as Error).stack}`);
      }
    }
  } finally {
    // VS Code's file watcher can briefly hold the directory on Windows (EBUSY); cleanup must not fail the run.
    await fs
      .rm(path.join(workspaceRoot(), ".claude"), { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      .catch((err) => console.warn(`cleanup skipped: ${err}`));
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} integration test(s) failed`);
  }
}

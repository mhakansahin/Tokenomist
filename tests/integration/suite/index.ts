// Smoke tests inside a real VS Code instance (US1 activation and commands). A tiny sequential runner
// keeps the dev dependencies to the ones in the constitution.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { TokenomistApi } from "../../../src/extension";

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

it("activates in a Spec Kit workspace and registers its commands", async () => {
  const { tracker } = await api();
  assert.ok(tracker, "tracker is running (not passive)");
  const commands = await vscode.commands.getCommands(true);
  for (const id of ["tokenomist.analyzeSpec", "tokenomist.showRecommendation"]) {
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

export async function run(): Promise<void> {
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
    await fs.rm(path.join(workspaceRoot(), ".claude"), { recursive: true, force: true });
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} integration test(s) failed`);
  }
}

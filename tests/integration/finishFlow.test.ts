// US2 end to end without VS Code (FR-015, FR-016, FR-017, SC-003).
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { post, readLocal, setup } from "./helpers";

async function lockedEnv(t: { after(fn: () => unknown): void }, localSettings?: unknown) {
  const env = await setup({ localSettings });
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("opus");
  const tasksPath = path.join(env.workspace.activeFeature!.absoluteDir, "tasks.md");
  return { ...env, tracker, tasksPath, server };
}

test("all tasks checked → completionPending and the user is asked; declining keeps the lock", async (t) => {
  const env = await lockedEnv(t);
  await fs.writeFile(env.tasksPath, "- [x] T001\n- [ ] T002\n");
  await env.tracker.onTasksChanged(env.workspace.activeFeature!);
  assert.equal(env.tracker.activeTracking()!.state, "locked", "not complete yet");

  env.ui.finishAnswer = "notYet";
  await fs.writeFile(env.tasksPath, "- [x] T001\n- [x] T002\n");
  await env.tracker.onTasksChanged(env.workspace.activeFeature!);
  assert.equal(env.ui.calls.filter((c) => c === "askFinish").length, 1);
  assert.equal(env.tracker.activeTracking()!.state, "locked");
  assert.equal((await readLocal(env.root))!.model, "opus");
});

test("dismissing the question leaves the spec in completionPending", async (t) => {
  const env = await lockedEnv(t);
  env.ui.finishAnswer = undefined;
  await fs.writeFile(env.tasksPath, "- [x] T001\n");
  await env.tracker.onTasksChanged(env.workspace.activeFeature!);
  assert.equal(env.tracker.activeTracking()!.state, "completionPending");
});

test("finishing restores the original local model exactly and records a summary", async (t) => {
  const env = await lockedEnv(t, { model: "claude-opus-5-5[1m]", permissions: { allow: ["Read"] } });
  env.ui.finishAnswer = "finish";
  await fs.writeFile(env.tasksPath, "- [x] T001\n");
  await env.tracker.onTasksChanged(env.workspace.activeFeature!);

  const local = (await readLocal(env.root))!;
  assert.equal(local.model, "claude-opus-5-5[1m]");
  assert.deepEqual(local.permissions, { allow: ["Read"] });
  assert.ok(local.hooks, "hooks stay while the extension is installed (FR-016 note)");
  assert.equal(env.tracker.activeTracking(), undefined, "tracking record removed");

  const [summary] = env.tracker.summaries();
  assert.equal(summary.usedModel, "opus");
  assert.equal(summary.recommendedModel, "opus");
  assert.equal(summary.level, "complex");
  assert.equal(summary.manualOverride, false);
  assert.equal(summary.estimatedSavingsPct, 0);
  assert.ok(env.ui.calls.includes("showSummary:opus"));
});

test("an absent original model is removed again", async (t) => {
  const env = await lockedEnv(t);
  await env.tracker.finish();
  assert.equal((await readLocal(env.root))!.model, undefined);
});

test("finishSpec works by hand and restores the user settings model changed by /model", async (t) => {
  const env = await lockedEnv(t);
  const userFile = path.join(env.root, "user-settings.json");
  await fs.writeFile(userFile, JSON.stringify({ theme: "dark", model: "sonnet" }));

  // A `/model haiku` accepted as a new lock snapshots the user model before Claude Code rewrites it.
  const { port, token } = env.server;
  env.ui.overrideAnswer = "update";
  await post(port, "/tokenomist/pre-model-switch", { session_id: "s", to_model: "claude-haiku-5-5", source: "command" }, token);
  await fs.writeFile(userFile, JSON.stringify({ theme: "dark", model: "haiku" }));

  await env.tracker.finish();
  assert.deepEqual(JSON.parse(await fs.readFile(userFile, "utf8")), { theme: "dark", model: "sonnet" });
  const [summary] = env.tracker.summaries();
  assert.equal(summary.manualOverride, true);
});

test("finishing without a lock only warns", async (t) => {
  const env = await setup();
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.finish();
  assert.ok(env.ui.calls.some((c) => c.startsWith("warn:")));
  assert.deepEqual(tracker.summaries(), []);
});

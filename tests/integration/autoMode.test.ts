// 004 full automatic mode without VS Code: real files and hook server, fake dialogs that must stay unused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { post, readLocal, setup } from "./helpers";

const ASK = /^(askUnlockedPlan|askSessionMismatch|askWriting|askFinish|pickModel)/;

async function autoEnv(t: { after(fn: () => unknown): void }, options: { localSettings?: unknown } = {}) {
  const env = await setup(options);
  env.settings.automation = "auto";
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  const expand = (command: string, session: string, extra: Record<string, unknown> = {}) =>
    post(server.port, "/tokenomist/expansion", { command_name: command, prompt: `/${command}`, cwd: env.root, session_id: session, ...extra }, server.token);
  return { ...env, tracker, server, expand };
}

test("spec saves only update the recommendation: no dialog, no lock (FR-002)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  const tracking = env.tracker.activeTracking()!;
  assert.equal(tracking.state, "awaitingApproval");
  assert.equal(tracking.lock, undefined);
  assert.deepEqual(env.ui.calls.filter((c) => c.startsWith("recommendationReady") || ASK.test(c)), []);
});

test("/speckit-plan without a lock: locks the recommendation, opens a new conversation with the same command (FR-003, FR-004, SC-004)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  const answer = await env.expand("speckit-plan", "old", { prompt: "/speckit-plan use the existing auth module" });
  assert.equal(answer.decision, "block");
  assert.match(String(answer.reason), /Opus/);
  assert.match(String(answer.reason), /Enter/);
  assert.equal(env.tracker.activeTracking()!.lock?.model, "opus");
  assert.equal(env.tracker.activeTracking()!.lock?.manualOverride, false);
  assert.deepEqual(env.newConversations, ["/speckit-plan use the existing auth module"]);
  assert.ok(env.ui.calls.includes("autoLocked:opus"));
  assert.deepEqual(env.ui.calls.filter((c) => ASK.test(c)), []);
});

test("an old conversation in a locked spec moves to a new one without asking (FR-003)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus");
  // The workspace dir predates the key write, so a "transcript" there marks an older session.
  const answer = await env.expand("speckit-tasks", "old", { transcript_path: env.root });
  assert.equal(answer.decision, "block");
  assert.deepEqual(env.newConversations, ["/speckit-tasks"]);
  assert.deepEqual(env.ui.calls.filter((c) => ASK.test(c)), []);
});

test("a conversation already on the locked model is left alone (US1-4)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus");
  assert.deepEqual(await env.expand("speckit-implement", "new"), {});
  assert.deepEqual(env.newConversations, []);
});

test("without the prefill capability only a new conversation opens and the message says to retype (FR-007)", async (t) => {
  const env = await autoEnv(t);
  env.prefillWorks.value = false;
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  const answer = await env.expand("speckit-plan", "old");
  assert.equal(answer.decision, "block");
  assert.match(String(answer.reason), /again in the new conversation/);
  assert.equal(env.newConversations.length, 1);
});

test("the same command again within 10 s is blocked without opening a second conversation (FR-010)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.expand("speckit-plan", "old", { transcript_path: env.root });
  const again = await env.expand("speckit-plan", "old", { transcript_path: env.root });
  assert.equal(again.decision, "block");
  assert.equal(env.newConversations.length, 1);
});

test("a spec that cannot be analysed falls back to asking", async (t) => {
  const env = await autoEnv(t);
  await env.workspace.writeSpec("# Notes only, no requirements yet");
  env.ui.unlockedPlanAnswer = "continue";
  assert.deepEqual(await env.expand("speckit-plan", "old"), {});
  assert.ok(env.ui.calls.some((c) => c.startsWith("askUnlockedPlan")));
});

test("plan.md appearing without the gate locks the latest recommendation (research R2)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await fs.writeFile(path.join(env.workspace.activeFeature!.absoluteDir, "plan.md"), "# Plan");
  await env.tracker.onPlanCreated(env.workspace.activeFeature!);
  assert.equal(env.tracker.activeTracking()!.lock?.model, "opus");
  assert.equal((await readLocal(env.root))!.model, "opus");
});

test("/model while locked is still asked in automatic mode (FR-011)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus");
  await post(env.server.port, "/tokenomist/pre-model-switch", { session_id: "s", to_model: "claude-haiku-5-5", requested_model: "haiku", source: "command" }, env.server.token);
  assert.ok(env.ui.calls.includes("askOverride:opus->haiku"));
});

test("the lock can be changed afterwards and counts as a manual choice (FR-002)", async (t) => {
  const env = await autoEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus");
  env.ui.pick = { model: "sonnet", manualOverride: true };
  await env.tracker.changeLockedModel();
  const lock = env.tracker.activeTracking()!.lock!;
  assert.equal(lock.model, "sonnet");
  assert.equal(lock.manualOverride, true);
  assert.equal(lock.segments.length, 2);
  assert.equal((await readLocal(env.root))!.model, "sonnet");
});

// US2
test("/speckit-specify moves to a new conversation with the command ready (FR-005)", async (t) => {
  const env = await autoEnv(t, { localSettings: { model: "opus" } });
  await env.workspace.setActive(undefined);
  const answer = await env.expand("speckit-specify", "old", { prompt: "/speckit-specify dark mode toggle" });
  assert.equal(answer.decision, "block");
  assert.deepEqual(env.newConversations, ["/speckit-specify dark mode toggle"]);
  assert.equal((await readLocal(env.root))!.model, "sonnet", "writing model applied");
  assert.deepEqual(env.tracker.pendingWriting()!.original.localModel, { present: true, value: "opus" });
  assert.deepEqual(env.ui.calls.filter((c) => ASK.test(c)), []);
});

test("all tasks done → finished without asking, original model restored, summary shown (FR-006)", async (t) => {
  const env = await autoEnv(t, { localSettings: { model: "claude-opus-5-5[1m]" } });
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("haiku");
  await fs.writeFile(path.join(env.workspace.activeFeature!.absoluteDir, "tasks.md"), "- [x] T001\n");
  await env.tracker.onTasksChanged(env.workspace.activeFeature!);
  assert.equal((await readLocal(env.root))!.model, "claude-opus-5-5[1m]");
  assert.ok(env.ui.calls.includes("showSummary:haiku"));
  assert.ok(!env.ui.calls.includes("askFinish"));
});

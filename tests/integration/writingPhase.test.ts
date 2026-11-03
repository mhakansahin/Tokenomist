// US3 spec-writing phase without VS Code (FR-003, data-model PendingWriting, clarify Q2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { post, readLocal, setup } from "./helpers";

async function started(t: { after(fn: () => unknown): void }, localSettings?: unknown) {
  const env = await setup({ localSettings });
  // Before /speckit-specify there is no new feature yet: point feature.json at nothing.
  await env.workspace.setActive(undefined);
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  return { ...env, tracker, server };
}

test("specify: snapshot + writing model, then bound to the new feature directory", async (t) => {
  const env = await started(t, { model: "opus" });
  env.ui.writingAnswer = "continue";
  const body = { command_name: "speckit-specify", cwd: env.root, session_id: "s" };
  assert.deepEqual(await post(env.server.port, "/tokenomist/expansion", body, env.server.token), {});
  assert.equal(env.ui.calls.filter((c) => c === "askWriting:sonnet").length, 1);

  const pending = env.tracker.pendingWriting()!;
  assert.deepEqual(pending.original.localModel, { present: true, value: "opus" });
  assert.equal(pending.writingModel, "sonnet");
  assert.equal((await readLocal(env.root))!.model, "sonnet");

  await env.workspace.setActive("specs/002-new");
  await env.workspace.writeSpec("# Feature Specification: New\n### User Story 1 - A\n- **FR-001**: x");
  await env.tracker.onFeatureChanged(env.workspace.activeFeature);
  const tracking = env.tracker.activeTracking()!;
  assert.ok(["writing", "awaitingApproval"].includes(tracking.state));
  assert.deepEqual(tracking.original?.localModel, { present: true, value: "opus" });
  assert.equal(tracking.writingModel, "sonnet");
  assert.ok(tracking.analysis, "the spec written before the feature switch is analysed");
  assert.equal(env.tracker.pendingWriting(), undefined);

  // Finishing later restores the model from before spec writing, not the writing model (clarify Q2).
  await env.tracker.review("haiku");
  await env.tracker.finish();
  assert.equal((await readLocal(env.root))!.model, "opus");
});

test("specify in a new conversation: the session started after the key write → no question", async (t) => {
  const env = await started(t);
  env.ui.writingAnswer = "newConversation";
  const first = await post(env.server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "a" }, env.server.token);
  assert.equal(first.decision, "block");
  assert.equal(env.newConversations.length, 1);
  const second = await post(env.server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "b" }, env.server.token);
  assert.deepEqual(second, {});
  assert.equal(env.ui.calls.filter((c) => c.startsWith("askWriting")).length, 1);
});

test("specify while another spec is locked keeps that spec's original, and it is resumed later", async (t) => {
  const env = await setup({ localSettings: { model: "opus" } });
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("haiku");

  env.ui.writingAnswer = "continue";
  await post(server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "s" }, server.token);
  assert.deepEqual(tracker.pendingWriting()!.original.localModel, { present: true, value: "opus" }, "not the lock's haiku");
  assert.equal((await readLocal(env.root))!.model, "sonnet");

  await env.workspace.setActive("specs/002-new");
  await tracker.onFeatureChanged(env.workspace.activeFeature);
  assert.equal((await readLocal(env.root))!.model, "sonnet", "the new spec keeps the writing model");

  await env.workspace.setActive("specs/001-chat");
  await tracker.onFeatureChanged(env.workspace.activeFeature);
  assert.equal((await readLocal(env.root))!.model, "haiku", "the locked spec is resumed");
});

test("an unbound pending writing expires after 24 hours and restores the model", async (t) => {
  const env = await started(t, { model: "opus" });
  env.ui.writingAnswer = "continue";
  await post(env.server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "s" }, env.server.token);
  await env.tracker.dispose();

  const later = env.makeTracker({ now: () => new Date(Date.now() + 25 * 3600_000) });
  await later.init();
  t.after(() => later.dispose());
  assert.equal(later.pendingWriting(), undefined);
  assert.equal((await readLocal(env.root))!.model, "opus");
});

test("the writing model follows the mode when configured", async (t) => {
  const env = await started(t);
  env.settings.writingModel = "haiku";
  env.ui.writingAnswer = "continue";
  await post(env.server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "s" }, env.server.token);
  assert.equal((await readLocal(env.root))!.model, "haiku");
});

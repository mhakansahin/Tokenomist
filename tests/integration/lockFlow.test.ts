// US1 end to end without VS Code: real files, real hook server, fake dialogs (FR-004, FR-010–FR-014,
// FR-023, FR-024, Edge Cases).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { post, readLocal, setup } from "./helpers";

test("spec save → awaitingApproval with a recommendation; approval locks via the local model key", async (t) => {
  const env = await setup({ localSettings: { permissions: { allow: ["Read"] } } });
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());

  await tracker.onSpecSaved(env.workspace.activeFeature!);
  const tracking = tracker.activeTracking()!;
  assert.equal(tracking.state, "awaitingApproval");
  assert.equal(tracking.analysis?.level, "complex");
  assert.deepEqual(env.ui.calls, ["recommendationReady:opus"]);

  await tracker.review();
  assert.equal(env.ui.calls.at(-1), "pickModel", "no choice made → still awaiting");
  assert.equal(tracker.activeTracking()!.state, "awaitingApproval");

  await tracker.review("opus");
  const locked = tracker.activeTracking()!;
  assert.equal(locked.state, "locked");
  assert.equal(locked.lock?.model, "opus");
  assert.equal(locked.lock?.manualOverride, false);
  assert.deepEqual(locked.original?.localModel, { present: false });
  const local = (await readLocal(env.root))!;
  assert.equal(local.model, "opus");
  assert.deepEqual(local.permissions, { allow: ["Read"] }, "user keys are kept");
  assert.equal(env.ui.calls.at(-1), "modelLocked:opus");
});

test("a manual choice is marked as override; a spec change while locked keeps the lock", async (t) => {
  const env = await setup();
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("sonnet");
  assert.equal(tracker.activeTracking()!.lock?.manualOverride, true);

  await env.workspace.writeSpec("# Feature Specification: tiny\n- **FR-001**: one");
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  assert.equal(tracker.activeTracking()!.state, "locked");
  assert.equal((await readLocal(env.root))!.model, "sonnet");
});

test("hooks are installed with the server port and token", async () => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  try {
    const hooks = (await readLocal(env.root))!.hooks as Record<string, Array<{ hooks: Array<{ url: string; headers: Record<string, string> }> }>>;
    assert.equal(hooks.UserPromptExpansion[0].hooks[0].url, `http://127.0.0.1:${port}/tokenomist/expansion`);
    assert.equal(hooks.PreModelSwitch[0].hooks[0].headers["X-Tokenomist-Token"], token);
  } finally {
    await tracker.dispose();
  }
});

test("/speckit-plan without a lock: approve → locked, prompt blocked, new conversation opened (FR-024)", async () => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  try {
    await tracker.onSpecSaved(env.workspace.activeFeature!);
    const answer = await post(port, "/tokenomist/expansion", { command_name: "speckit-plan", cwd: env.root, session_id: "old" }, token);
    assert.equal(answer.decision, "block");
    assert.match(String(answer.reason), /opus/i);
    assert.equal(tracker.activeTracking()!.lock?.model, "opus");
    assert.equal(env.newConversations.length, 1);

    // The new conversation starts after the key write → it runs the locked model: no question.
    const again = await post(port, "/tokenomist/expansion", { command_name: "speckit-plan", cwd: env.root, session_id: "new" }, token);
    assert.deepEqual(again, {});
    assert.equal(env.ui.calls.filter((c) => c.startsWith("askSessionMismatch")).length, 0);
  } finally {
    await tracker.dispose();
  }
});

test("/speckit-plan without a lock: continue → allowed and not asked again for that session", async () => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  try {
    env.ui.unlockedPlanAnswer = "continue";
    const body = { command_name: "speckit-plan", cwd: env.root, session_id: "s" };
    assert.deepEqual(await post(port, "/tokenomist/expansion", body, token), {});
    assert.deepEqual(await post(port, "/tokenomist/expansion", body, token), {});
    assert.equal(env.ui.calls.filter((c) => c.startsWith("askUnlockedPlan")).length, 1);
    assert.equal(tracker.activeTracking()?.lock, undefined);
  } finally {
    await tracker.dispose();
  }
});

test("an old session in a locked spec is asked once; a foreign cwd is ignored", async () => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  try {
    await tracker.onSpecSaved(env.workspace.activeFeature!);
    await tracker.review("opus");
    env.ui.mismatchAnswer = "continue";
    // The workspace dir predates the key write, so a "transcript" there marks an older session.
    const body = { command_name: "speckit-tasks", cwd: env.root, session_id: "old", transcript_path: env.root };
    assert.deepEqual(await post(port, "/tokenomist/expansion", body, token), {});
    assert.deepEqual(await post(port, "/tokenomist/expansion", body, token), {});
    assert.equal(env.ui.calls.filter((c) => c.startsWith("askSessionMismatch")).length, 1);
    assert.deepEqual(
      await post(port, "/tokenomist/expansion", { command_name: "speckit-plan", cwd: path.dirname(env.root), session_id: "x" }, token),
      {},
    );
  } finally {
    await tracker.dispose();
  }
});

test("/model while locked: revert denies, update moves the lock and snapshots user settings (FR-023)", async () => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  try {
    await tracker.onSpecSaved(env.workspace.activeFeature!);
    await tracker.review("opus");
    const body = { session_id: "s", from_model: "claude-opus-5-5", to_model: "claude-haiku-5-5", source: "command" };

    const denied = await post(port, "/tokenomist/pre-model-switch", body, token);
    assert.deepEqual(denied.hookSpecificOutput, { hookEventName: "PreModelSwitch", permissionDecision: "deny" });
    assert.ok(denied.systemMessage);
    assert.equal(tracker.activeTracking()!.lock?.model, "opus");

    env.ui.overrideAnswer = "update";
    const allowed = await post(port, "/tokenomist/pre-model-switch", body, token);
    assert.deepEqual(allowed.hookSpecificOutput, { hookEventName: "PreModelSwitch", permissionDecision: "allow" });
    const lock = tracker.activeTracking()!.lock!;
    assert.equal(lock.model, "haiku");
    assert.equal(lock.manualOverride, true);
    assert.equal(lock.segments.length, 2);
    assert.deepEqual(tracker.activeTracking()!.original?.userModel, { present: false });
    assert.equal((await readLocal(env.root))!.model, "haiku");
  } finally {
    await tracker.dispose();
  }
});

test("state survives a restart (FR-014)", async () => {
  const env = await setup();
  const first = env.makeTracker();
  await first.init();
  await first.onSpecSaved(env.workspace.activeFeature!);
  await first.review("opus");
  await first.dispose();

  const second = env.makeTracker();
  await second.init();
  try {
    assert.equal(second.activeTracking()!.state, "locked");
    assert.equal((await readLocal(env.root))!.model, "opus");
  } finally {
    await second.dispose();
  }
});

test("switching features suspends and restores the original model, then re-applies the lock", async () => {
  const env = await setup({ localSettings: { model: "claude-opus-5-5[1m]" } });
  const tracker = env.makeTracker();
  await tracker.init();
  try {
    await tracker.onSpecSaved(env.workspace.activeFeature!);
    await tracker.review("haiku");
    assert.equal((await readLocal(env.root))!.model, "haiku");

    await env.workspace.setActive("specs/002-other");
    await tracker.onFeatureChanged(env.workspace.activeFeature);
    assert.equal((await readLocal(env.root))!.model, "claude-opus-5-5[1m]");

    await env.workspace.setActive("specs/001-chat");
    await tracker.onFeatureChanged(env.workspace.activeFeature);
    assert.equal(tracker.activeTracking()!.state, "locked");
    assert.equal((await readLocal(env.root))!.model, "haiku");
  } finally {
    await tracker.dispose();
  }
});

test("a broken settings.local.json is never overwritten", async () => {
  const env = await setup();
  const { promises: fs } = await import("node:fs");
  await fs.mkdir(path.join(env.root, ".claude"), { recursive: true });
  await fs.writeFile(path.join(env.root, ".claude", "settings.local.json"), "{ broken");
  const tracker = env.makeTracker();
  await tracker.init();
  try {
    await tracker.onSpecSaved(env.workspace.activeFeature!);
    await tracker.review("opus");
    assert.equal(await fs.readFile(path.join(env.root, ".claude", "settings.local.json"), "utf8"), "{ broken");
    assert.ok(env.ui.calls.some((c) => c.startsWith("warn:")));
    assert.equal(tracker.passiveReason, "settingsUnreadable");
  } finally {
    await tracker.dispose();
  }
});

// Regression (0.2.0): an allowed command must not start a spec-writing phase that overwrites the lock.
test("an allowed phase command keeps the locked model in the settings and starts no writing phase", async (t) => {
  const env = await setup();
  const tracker = env.makeTracker();
  const { port, token } = await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("opus");
  // A brand-new session (no transcript yet) runs the locked model → the gate allows the command.
  assert.deepEqual(await post(port, "/tokenomist/expansion", { command_name: "speckit-tasks", cwd: env.root, session_id: "n" }, token), {});
  assert.deepEqual(await post(port, "/tokenomist/expansion", { command_name: "deploy", cwd: env.root, session_id: "n" }, token), {});
  assert.equal(tracker.pendingWriting(), undefined);
  assert.equal((await readLocal(env.root))!.model, "opus");
});

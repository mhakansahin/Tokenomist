// 002 US1 end to end without VS Code: custom mode values flow into the recommendation, the lock and
// Claude Code's settings exactly (FR-001, FR-002, FR-008, FR-011, FR-014, SC-005).
import { test } from "node:test";
import assert from "node:assert/strict";
import { post, readLocal, setup } from "./helpers";

async function customEnv(t: { after(fn: () => unknown): void }, localSettings?: unknown) {
  const env = await setup({ localSettings });
  env.settings.mode = "custom";
  env.settings.custom = { complex: "opus[1m]" };
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  return { ...env, tracker, server };
}

test("a custom cell is recommended and written to Claude Code exactly", async (t) => {
  const env = await customEnv(t, { model: "claude-opus-5-5[1m]" });
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  assert.equal(env.tracker.activeTracking()!.analysis!.recommendedModel, "opus[1m]");

  await env.tracker.review("opus[1m]");
  const lock = env.tracker.activeTracking()!.lock!;
  assert.equal(lock.model, "opus[1m]");
  assert.equal(lock.manualOverride, false);
  assert.equal((await readLocal(env.root))!.model, "opus[1m]");

  await env.tracker.finish();
  assert.equal((await readLocal(env.root))!.model, "claude-opus-5-5[1m]", "original restored exactly");
});

test("a free-text Claude value is normalised and counts as a manual choice (FR-014)", async (t) => {
  const env = await customEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review(" Claude-Sonnet-5-5 ");
  const lock = env.tracker.activeTracking()!.lock!;
  assert.equal(lock.model, "claude-sonnet-5-5");
  assert.equal(lock.manualOverride, true);
  assert.equal((await readLocal(env.root))!.model, "claude-sonnet-5-5");
});

test("changing the custom table while locked keeps the lock (FR-011)", async (t) => {
  const env = await customEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus[1m]");
  env.settings.custom = { complex: "sonnet" };
  await env.tracker.onSettingsChanged();
  assert.equal(env.tracker.activeTracking()!.lock!.model, "opus[1m]");
  assert.equal((await readLocal(env.root))!.model, "opus[1m]");
});

test("before the lock, a changed custom table re-computes the recommendation", async (t) => {
  const env = await customEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  env.settings.custom = { complex: "opusplan" };
  await env.tracker.onSettingsChanged();
  assert.equal(env.tracker.activeTracking()!.analysis!.recommendedModel, "opusplan");
});

test("the custom spec-writing value is applied during /speckit-specify (FR-002)", async (t) => {
  const env = await customEnv(t);
  await env.workspace.setActive(undefined);
  env.settings.writingModel = "opusplan";
  env.ui.writingAnswer = "continue";
  await post(env.server.port, "/tokenomist/expansion", { command_name: "speckit-specify", cwd: env.root, session_id: "s" }, env.server.token);
  assert.equal((await readLocal(env.root))!.model, "opusplan");
});

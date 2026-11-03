// Polish: cleanup command and the restore ledger used on uninstall (constitution Kısıt 4, quickstart S15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readLocal, setup } from "./helpers";

test("the ledger always knows what to restore in this workspace", async (t) => {
  const env = await setup({ localSettings: { model: "claude-opus-5-5[1m]" } });
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  assert.deepEqual((await env.ledger.read())[env.root], {}, "hooks installed, model key not owned yet");

  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("haiku");
  assert.deepEqual((await env.ledger.read())[env.root], { restore: { present: true, value: "claude-opus-5-5[1m]" } });

  await tracker.finish();
  assert.deepEqual((await env.ledger.read())[env.root], {});
});

test("cleanup restores the original model, removes only Tokenomist hooks and forgets the workspace", async (t) => {
  const userHook = { matcher: "", hooks: [{ type: "command", command: "echo mine" }] };
  const env = await setup({ localSettings: { model: "sonnet", hooks: { PreModelSwitch: [userHook] } } });
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("opus");

  env.ui.confirmCleanupAnswer = true;
  await tracker.cleanClaudeSettings();
  assert.deepEqual(await readLocal(env.root), { model: "sonnet", hooks: { PreModelSwitch: [userHook] } });
  assert.equal(tracker.activeTracking(), undefined);
  assert.equal((await env.ledger.read())[env.root], undefined);
});

test("cleanup asks first while a spec is locked and does nothing on cancel", async (t) => {
  const env = await setup();
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.onSpecSaved(env.workspace.activeFeature!);
  await tracker.review("opus");

  env.ui.confirmCleanupAnswer = false;
  await tracker.cleanClaudeSettings();
  assert.equal((await readLocal(env.root))!.model, "opus");
  assert.equal(tracker.activeTracking()!.state, "locked");
});

test("a file Tokenomist created and emptied by cleanup is deleted", async (t) => {
  const env = await setup();
  const tracker = env.makeTracker();
  await tracker.init();
  t.after(() => tracker.dispose());
  await tracker.cleanClaudeSettings();
  assert.equal(await readLocal(env.root), undefined);
});

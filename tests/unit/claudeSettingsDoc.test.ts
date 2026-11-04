import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyModel,
  parseSettings,
  removeTokenomistHooks,
  restoreModel,
  serializeSettings,
  SettingsParseError,
  takeKeySnapshot,
  upsertTokenomistHooks,
} from "../../src/domain/claudeSettingsDoc";

const userHook = { type: "command", command: "echo user" };

test("applyModel adds model and keeps other keys", () => {
  const doc = parseSettings('{"permissions":{"allow":["Read"]}}');
  const next = applyModel(doc, "opus");
  assert.equal(next.model, "opus");
  assert.deepEqual(next.permissions, { allow: ["Read"] });
  assert.equal(doc.model, undefined, "input is not mutated");
});

test("applyModel writes any valid Claude value exactly and rejects others (002 FR-008, SC-005)", () => {
  for (const value of ["opus[1m]", "opusplan", "claude-opus-5-5", "sonnet[1m]"]) {
    assert.equal(applyModel({}, value).model, value);
  }
  for (const value of ["gpt-5", "default", "", "haiku[1m]"]) {
    assert.throws(() => applyModel({}, value), value);
  }
});

test("snapshot of absent model restores by deleting the key", () => {
  const before = parseSettings('{"env":{"A":"1"}}');
  const snap = takeKeySnapshot(before);
  assert.deepEqual(snap, { present: false });
  const restored = restoreModel(applyModel(before, "haiku"), snap);
  assert.deepEqual(restored, before);
});

test("snapshot of present model restores the exact value", () => {
  const before = parseSettings('{"model":"claude-opus-5-5[1m]"}');
  const snap = takeKeySnapshot(before);
  assert.deepEqual(snap, { present: true, value: "claude-opus-5-5[1m]" });
  assert.deepEqual(restoreModel(applyModel(before, "sonnet"), snap), before);
});

test("parse: empty or missing text is an empty document", () => {
  assert.deepEqual(parseSettings(undefined), {});
  assert.deepEqual(parseSettings("   \n"), {});
});

test("parse: invalid JSON or a non-object raises SettingsParseError", () => {
  assert.throws(() => parseSettings("{ // comment\n}"), SettingsParseError);
  assert.throws(() => parseSettings("[1,2]"), SettingsParseError);
});

test("upsert keeps user hooks in the same event array and replaces only Tokenomist ones", () => {
  const doc = {
    hooks: {
      PreModelSwitch: [{ hooks: [userHook] }],
      UserPromptExpansion: [
        { matcher: "x", hooks: [{ type: "http", url: "http://127.0.0.1:1/tokenomist/expansion" }] },
      ],
    },
  };
  const next = upsertTokenomistHooks(doc, 5555, "tok");
  const hooks = next.hooks as Record<string, Array<{ matcher?: string; hooks: Array<Record<string, unknown>> }>>;
  assert.deepEqual(hooks.PreModelSwitch[0], { hooks: [userHook] });
  const ours = hooks.PreModelSwitch[1].hooks[0];
  assert.equal(ours.url, "http://127.0.0.1:5555/tokenomist/pre-model-switch");
  assert.deepEqual(ours.headers, { "X-Tokenomist-Token": "tok" });
  assert.equal(hooks.UserPromptExpansion.length, 1, "old Tokenomist group replaced, not duplicated");
  assert.equal(hooks.UserPromptExpansion[0].matcher, "speckit-specify|speckit-plan|speckit-tasks|speckit-implement");
  assert.equal(hooks.UserPromptExpansion[0].hooks[0].url, "http://127.0.0.1:5555/tokenomist/expansion");
  assert.ok(hooks.PostModelSwitch, "PostModelSwitch registered");
  assert.equal(hooks.SessionStart, undefined, "SessionStart has no http support (spike)");
});

test("remove deletes only Tokenomist hooks and prunes empty containers", () => {
  const withOurs = upsertTokenomistHooks({ hooks: { PreModelSwitch: [{ hooks: [userHook] }] } }, 1, "t");
  assert.deepEqual(removeTokenomistHooks(withOurs), { hooks: { PreModelSwitch: [{ hooks: [userHook] }] } });
  assert.deepEqual(removeTokenomistHooks(upsertTokenomistHooks({}, 1, "t")), {});
});

test("serialize uses 2-space indent and a trailing newline", () => {
  assert.equal(serializeSettings({ model: "opus" }), '{\n  "model": "opus"\n}\n');
});

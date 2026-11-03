import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSessionModel, SessionModels } from "../../src/app/sessionModels";

const written = Date.parse("2026-11-03T10:00:00Z");

test("an observed switch wins", () => {
  assert.equal(
    resolveSessionModel({ observed: "haiku", sessionStartedAt: written + 1, keyWrittenAt: written, keyModel: "opus" }),
    "haiku",
  );
});

test("a session started after the last model-key write runs the key's model", () => {
  assert.equal(resolveSessionModel({ sessionStartedAt: written + 1000, keyWrittenAt: written, keyModel: "opus" }), "opus");
  assert.equal(resolveSessionModel({ sessionStartedAt: undefined, keyWrittenAt: written, keyModel: "opus" }), "opus");
});

test("an older session, or no key write, is unknown", () => {
  assert.equal(resolveSessionModel({ sessionStartedAt: written - 1000, keyWrittenAt: written, keyModel: "opus" }), undefined);
  assert.equal(resolveSessionModel({ sessionStartedAt: written + 1000, keyWrittenAt: undefined, keyModel: "opus" }), undefined);
});

test("the store records families from full ids and acknowledgements per session and lock", () => {
  const store = new SessionModels();
  store.observe("s1", "claude-sonnet-5-5");
  store.observe("s2", "something-else");
  assert.equal(store.observed("s1"), "sonnet");
  assert.equal(store.observed("s2"), undefined);
  store.acknowledge("s1", "lock-a");
  assert.equal(store.isAcknowledged("s1", "lock-a"), true);
  assert.equal(store.isAcknowledged("s1", "lock-b"), false);
});

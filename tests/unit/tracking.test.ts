import { test } from "node:test";
import assert from "node:assert/strict";
import { InvalidTransitionError, managesModelKey, transition, TrackingStatus } from "../../src/domain/tracking";

const at = (state: TrackingStatus["state"]): TrackingStatus => ({ state });

test("writing → awaitingApproval when the spec is saved", () => {
  assert.deepEqual(transition(at("writing"), { type: "specSaved" }), at("awaitingApproval"));
  assert.deepEqual(transition(at("awaitingApproval"), { type: "specSaved" }), at("awaitingApproval"));
});

test("approval or manual choice locks from writing and awaitingApproval", () => {
  assert.deepEqual(transition(at("writing"), { type: "lock" }), at("locked"));
  assert.deepEqual(transition(at("awaitingApproval"), { type: "lock" }), at("locked"));
});

test("a spec change while locked does not change the lock", () => {
  assert.deepEqual(transition(at("locked"), { type: "specSaved" }), at("locked"));
});

test("completion is detected, can be declined, and finishes", () => {
  assert.deepEqual(transition(at("locked"), { type: "tasksComplete" }), at("completionPending"));
  assert.deepEqual(transition(at("completionPending"), { type: "finishDeclined" }), at("locked"));
  assert.equal(transition(at("completionPending"), { type: "finish" }), "completed");
  assert.equal(transition(at("locked"), { type: "finish" }), "completed");
});

test("suspend remembers the previous state and resume restores it", () => {
  const suspended = transition(at("locked"), { type: "suspend" });
  assert.deepEqual(suspended, { state: "suspended", resumeState: "locked" });
  assert.deepEqual(transition(suspended as TrackingStatus, { type: "resume" }), at("locked"));
});

test("specify on an already tracked spec returns to writing unless locked", () => {
  assert.deepEqual(transition(at("awaitingApproval"), { type: "writingStarted" }), at("writing"));
  assert.deepEqual(transition(at("locked"), { type: "writingStarted" }), at("locked"));
});

test("invalid transitions are rejected", () => {
  assert.throws(() => transition(at("locked"), { type: "lock" }), InvalidTransitionError);
  assert.throws(() => transition(at("writing"), { type: "finish" }), InvalidTransitionError);
  assert.throws(() => transition(at("writing"), { type: "resume" }), InvalidTransitionError);
  assert.throws(() => transition(at("suspended"), { type: "specSaved" }), InvalidTransitionError);
  assert.throws(() => transition(at("awaitingApproval"), { type: "tasksComplete" }), InvalidTransitionError);
});

test("suspended records never manage the model key", () => {
  assert.equal(managesModelKey("suspended"), false);
  for (const s of ["writing", "awaitingApproval", "locked", "completionPending"] as const) {
    assert.equal(managesModelKey(s), true, s);
  }
});

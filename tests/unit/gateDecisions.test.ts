import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideExpansion,
  decidePreModelSwitch,
  expansionResponse,
  GateContext,
  isInsideWorkspace,
  preModelSwitchResponse,
  TIMEOUT_ANSWER,
} from "../../src/domain/gateDecisions";

const ctx = (over: Partial<GateContext> = {}): GateContext => ({
  workspaceRoot: "C:\\work\\app",
  writingModel: "sonnet",
  ...over,
});
const expansion = (command: string, cwd = "C:\\work\\app") => ({ command_name: command, cwd, session_id: "s1" });

test("cwd outside the tracked workspace is ignored", () => {
  assert.deepEqual(decideExpansion(expansion("speckit-plan", "C:\\other"), ctx()), { kind: "allow" });
  assert.equal(isInsideWorkspace("c:\\work\\app\\sub", "C:\\work\\app", "win32"), true);
  assert.equal(isInsideWorkspace("/work/app2", "/work/app", "linux"), false);
});

test("specify asks unless the session already runs the writing model", () => {
  assert.deepEqual(decideExpansion(expansion("speckit-specify"), ctx()), { kind: "askWriting", model: "sonnet" });
  assert.deepEqual(decideExpansion(expansion("speckit-specify"), ctx({ sessionModel: "sonnet" })), {
    kind: "startWriting",
    model: "sonnet",
  });
});

test("plan without a lock asks for approval with the recommendation", () => {
  assert.deepEqual(
    decideExpansion(expansion("speckit-plan"), ctx({ tracking: { state: "awaitingApproval", recommendedModel: "opus" } })),
    { kind: "askUnlockedPlan", recommendedModel: "opus" },
  );
  assert.deepEqual(decideExpansion(expansion("speckit-plan"), ctx()), { kind: "askUnlockedPlan", recommendedModel: undefined });
});

test("locked phases ask when the session model differs or is unknown", () => {
  const locked = ctx({ tracking: { state: "locked", lockedModel: "opus" } });
  for (const cmd of ["speckit-plan", "speckit-tasks", "speckit-implement"]) {
    assert.deepEqual(decideExpansion(expansion(cmd), locked), { kind: "askSessionMismatch", lockedModel: "opus" }, cmd);
    assert.deepEqual(decideExpansion(expansion(cmd), { ...locked, sessionModel: "haiku" }), {
      kind: "askSessionMismatch",
      lockedModel: "opus",
    });
    assert.deepEqual(decideExpansion(expansion(cmd), { ...locked, sessionModel: "opus" }), { kind: "allow" }, cmd);
  }
});

test("tasks/implement without a lock and unrelated commands are allowed", () => {
  assert.deepEqual(decideExpansion(expansion("speckit-tasks"), ctx()), { kind: "allow" });
  assert.deepEqual(decideExpansion(expansion("deploy"), ctx()), { kind: "allow" });
});

test("expansion responses: allow is empty, block carries the reason", () => {
  assert.deepEqual(expansionResponse({ kind: "allow" }), {});
  assert.deepEqual(expansionResponse({ kind: "block", reason: "go" }), { decision: "block", reason: "go" });
  assert.deepEqual(TIMEOUT_ANSWER.expansion, { kind: "allow" });
});

test("model switch is allowed without a lock or to the locked model", () => {
  const input = { to_model: "claude-sonnet-5-5", from_model: "claude-opus-5-5", source: "command" };
  assert.deepEqual(decidePreModelSwitch(input, ctx()), { kind: "allow" });
  assert.deepEqual(decidePreModelSwitch({ ...input, to_model: "claude-opus-5-5" }, ctx({ tracking: { state: "locked", lockedModel: "opus" } })), {
    kind: "allow",
  });
});

test("a different or unknown target while locked asks the user (FR-023)", () => {
  const locked = ctx({ tracking: { state: "locked", lockedModel: "opus" } });
  assert.deepEqual(decidePreModelSwitch({ to_model: "claude-haiku-5-5", source: "command" }, locked), {
    kind: "askOverride",
    lockedModel: "opus",
    targetModel: "haiku",
    persistsToUserSettings: true,
  });
  // The picker's Enter also saves to user settings; only SDK switches never do.
  assert.deepEqual(decidePreModelSwitch({ to_model: "default", source: "picker" }, locked), {
    kind: "askOverride",
    lockedModel: "opus",
    targetModel: undefined,
    persistsToUserSettings: true,
  });
  assert.equal(
    (decidePreModelSwitch({ to_model: "claude-haiku-5-5", source: "sdk" }, locked) as { persistsToUserSettings: boolean })
      .persistsToUserSettings,
    false,
  );
});

test("model switch responses and timeout default (deny)", () => {
  assert.deepEqual(preModelSwitchResponse({ kind: "allow" }), {
    hookSpecificOutput: { hookEventName: "PreModelSwitch", permissionDecision: "allow" },
  });
  assert.deepEqual(preModelSwitchResponse({ kind: "deny", message: "kept" }), {
    hookSpecificOutput: { hookEventName: "PreModelSwitch", permissionDecision: "deny" },
    systemMessage: "kept",
  });
  assert.equal(TIMEOUT_ANSWER.preModelSwitch.kind, "deny");
});

// 002 FR-009, contracts/settings-and-matching.md: requested_model carries the [1m] variant.
test("002: the requested value decides compatibility with the lock", () => {
  const lockOn = (lockedModel: string) => ctx({ tracking: { state: "locked", lockedModel } });
  const ask = (lockedModel: string, targetModel: string | undefined) => ({
    kind: "askOverride",
    lockedModel,
    targetModel,
    persistsToUserSettings: true,
  });
  const sw = (requested_model: string | null, to_model: string) => ({ requested_model, to_model, source: "command" });

  assert.deepEqual(decidePreModelSwitch(sw("opus[1m]", "claude-opus-5-5"), lockOn("opus[1m]")), { kind: "allow" });
  assert.deepEqual(decidePreModelSwitch(sw("claude-opus-5-5", "claude-opus-5-5"), lockOn("opus")), { kind: "allow" });
  assert.deepEqual(decidePreModelSwitch(sw("opus", "claude-opus-5-5"), lockOn("opus[1m]")), ask("opus[1m]", "opus"));
  assert.deepEqual(decidePreModelSwitch(sw("opusplan", "claude-sonnet-5-5"), lockOn("opusplan")), { kind: "allow" });
  assert.deepEqual(decidePreModelSwitch(sw("sonnet", "claude-sonnet-5-5"), lockOn("opusplan")), ask("opusplan", "sonnet"));
  // `/model default` sends requested_model: null — there is no value to lock to.
  assert.deepEqual(decidePreModelSwitch(sw(null, "claude-opus-5-5"), lockOn("haiku")), ask("haiku", undefined));
});

test("002: the gate compares the session model with the lock by compatibility", () => {
  const locked = ctx({ tracking: { state: "locked", lockedModel: "opus[1m]" } });
  assert.deepEqual(decideExpansion(expansion("speckit-tasks"), { ...locked, sessionModel: "opus" }), {
    kind: "askSessionMismatch",
    lockedModel: "opus[1m]",
  });
  assert.deepEqual(decideExpansion(expansion("speckit-tasks"), { ...locked, sessionModel: "opus[1m]" }), { kind: "allow" });
  const byId = ctx({ tracking: { state: "locked", lockedModel: "opus" } });
  assert.deepEqual(decideExpansion(expansion("speckit-plan"), { ...byId, sessionModel: "claude-opus-5-5" }), { kind: "allow" });
});

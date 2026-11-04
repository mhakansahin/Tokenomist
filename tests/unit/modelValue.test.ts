// 002 FR-003–FR-005, FR-010, FR-015, SC-001 (research.md R3, R4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { modelInfo, parseModelValue } from "../../src/domain/modelValue";

const ACCEPTED: Array<[string, string]> = [
  ["haiku", "haiku"],
  ["sonnet", "sonnet"],
  ["opus", "opus"],
  ["fable", "fable"],
  ["best", "best"],
  ["sonnet[1m]", "sonnet[1m]"],
  ["opus[1m]", "opus[1m]"],
  ["fable[1m]", "fable[1m]"],
  ["opusplan", "opusplan"],
  ["claude-opus-5-5", "claude-opus-5-5"],
  ["claude-sonnet-5-5[1m]", "claude-sonnet-5-5[1m]"],
  [" Claude-Opus-5-5 ", "claude-opus-5-5"],
  ["Opus[1M]", "opus[1m]"],
];

const REJECTED: Array<[string, string]> = [
  ["", "empty"],
  ["   ", "empty"],
  ["default", "default"],
  ["gpt-5", "notClaude"],
  ["gemini-2.5-pro", "notClaude"],
  ["o3", "notClaude"],
  ["llama-4", "notClaude"],
  ["haiku[1m]", "unknownVariant"],
  ["opus[2m]", "unknownVariant"],
  ["opus[1M]x", "unknownVariant"],
  ["claude-opus 5", "unknownVariant"],
];

test("accepted values are normalised (FR-003, FR-005)", () => {
  for (const [raw, value] of ACCEPTED) {
    assert.deepEqual(parseModelValue(raw), { ok: true, value }, raw);
  }
});

test("non-Claude and unknown values are rejected with a reason (FR-004, SC-001)", () => {
  for (const [raw, reason] of REJECTED) {
    assert.deepEqual(parseModelValue(raw), { ok: false, reason }, JSON.stringify(raw));
  }
  assert.deepEqual(parseModelValue(undefined), { ok: false, reason: "empty" });
  assert.deepEqual(parseModelValue(42), { ok: false, reason: "empty" });
});

test("family, context variant and display name", () => {
  const info = (v: string) => modelInfo(v);
  assert.deepEqual([info("opus").family, info("opus").longContext, info("opus").displayName], ["opus", false, "Opus"]);
  assert.deepEqual([info("opus[1m]").family, info("opus[1m]").longContext, info("opus[1m]").displayName], ["opus", true, "Opus 1M"]);
  assert.equal(info("opusplan").displayName, "Opus Plan");
  assert.equal(info("opusplan").family, undefined);
  assert.equal(info("best").displayName, "Best");
  assert.equal(info("best").family, undefined);
  assert.equal(info("claude-3-5-haiku-20241022").family, "haiku");
  assert.equal(info("claude-sonnet-5-5[1m]").longContext, true);
  assert.equal(info("claude-opus-5-5").displayName, "claude-opus-5-5");
  assert.equal(info("claude-mystery-9").family, undefined);
});

test("savings weights and whether they are known (research.md R4)", () => {
  const expect: Array<[string, number, boolean]> = [
    ["haiku", 0.2, true],
    ["claude-haiku-4-5", 0.2, true],
    ["sonnet", 0.6, true],
    ["sonnet[1m]", 0.6, true],
    ["claude-sonnet-5-5", 0.6, true],
    ["opus", 1, true],
    ["opus[1m]", 1, true],
    ["claude-opus-5-5", 1, true],
    ["opusplan", 0.8, true],
    ["fable", 1, false],
    ["fable[1m]", 1, false],
    ["best", 1, false],
    ["claude-mystery-9", 1, false],
  ];
  for (const [value, weight, known] of expect) {
    assert.equal(modelInfo(value).weight, weight, value);
    assert.equal(modelInfo(value).savingsKnown, known, value);
  }
});

test("Fable and best use usage credits (FR-015)", () => {
  for (const value of ["fable", "fable[1m]", "best", "claude-fable-5-1"]) {
    assert.equal(modelInfo(value).usesCredits, true, value);
  }
  for (const value of ["opus", "opus[1m]", "opusplan", "claude-opus-5-5"]) {
    assert.equal(modelInfo(value).usesCredits, false, value);
  }
});

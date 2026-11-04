// 002 FR-009, contracts/settings-and-matching.md "PreModelSwitch eşleşmesi".
import { test } from "node:test";
import assert from "node:assert/strict";
import { compatible } from "../../src/domain/modelValue";

const ROWS: Array<[locked: string, requested: string | null, toModel: string | null, expected: boolean]> = [
  ["opus", "opus", "claude-opus-5-5", true],
  ["opus", "claude-opus-5-5", "claude-opus-5-5", true],
  ["opus", "opus[1m]", "claude-opus-5-5", false],
  ["opus[1m]", "opus[1m]", "claude-opus-5-5", true],
  ["opus[1m]", null, "claude-opus-5-5", false],
  ["opusplan", "opusplan", "claude-sonnet-5-5", true],
  ["opusplan", "sonnet", "claude-sonnet-5-5", false],
  ["haiku", null, "claude-opus-5-5", false],
];

test("every row of the contract table", () => {
  for (const [locked, requested, toModel, expected] of ROWS) {
    assert.equal(compatible(locked, requested, toModel), expected, `${locked} vs ${requested}/${toModel}`);
  }
});

test("without a requested value the target family decides, unless the variant matters", () => {
  assert.equal(compatible("haiku", null, "claude-haiku-5-5"), true);
  assert.equal(compatible("claude-sonnet-5-5", undefined, "claude-sonnet-5-5"), true);
  assert.equal(compatible("sonnet[1m]", null, "claude-sonnet-5-5"), false);
  assert.equal(compatible("opusplan", null, "claude-opus-5-5"), false);
  assert.equal(compatible("best", null, "claude-fable-5-1"), false, "best has no fixed family");
});

test("an unusable requested value falls back to the target model", () => {
  assert.equal(compatible("opus", "gpt-5", null), false);
  assert.equal(compatible("opus", "default", "claude-opus-5-5"), true, "default is not a value → falls back to to_model");
});

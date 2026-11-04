// 002 FR-001, FR-002, FR-006.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODE_MAPPING, resolveMapping, writingValueFor } from "../../src/domain/classification";

test("custom mode: filled cells win, empty cells use balanced", () => {
  assert.deepEqual(resolveMapping("custom", { complex: "opus[1m]" }), { simple: "haiku", medium: "sonnet", complex: "opus[1m]" });
  assert.deepEqual(resolveMapping("custom", { simple: "claude-haiku-4-5", medium: "opusplan" }), {
    simple: "claude-haiku-4-5",
    medium: "opusplan",
    complex: "opus",
  });
});

test("an empty custom table behaves like balanced", () => {
  assert.deepEqual(resolveMapping("custom", {}), MODE_MAPPING.balanced);
  assert.deepEqual(resolveMapping("custom"), MODE_MAPPING.balanced);
});

test("the three preset modes ignore the custom table (FR-006)", () => {
  for (const mode of ["saver", "balanced", "quality"] as const) {
    assert.deepEqual(resolveMapping(mode, { simple: "opus[1m]", medium: "opus[1m]", complex: "opus[1m]" }), MODE_MAPPING[mode], mode);
  }
});

test("spec writing: the custom cell wins only in custom mode (FR-002)", () => {
  assert.equal(writingValueFor("custom", false, { writing: "opusplan" }), "opusplan");
  assert.equal(writingValueFor("custom", true, { writing: "opusplan" }), "opusplan");
  assert.equal(writingValueFor("balanced", false, { writing: "opusplan" }), "sonnet");
  assert.equal(writingValueFor("quality", true, { writing: "opusplan" }), "opus");
});

test("an empty writing cell falls back to 001; follow-mode in custom acts like balanced (analyze U1)", () => {
  assert.equal(writingValueFor("custom", false, {}), "sonnet");
  assert.equal(writingValueFor("custom", true, {}), "sonnet");
});

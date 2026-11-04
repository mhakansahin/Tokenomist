import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCustomTable, resolveMode, resolveThresholds } from "../../src/domain/settingsValidation";
import { DEFAULT_THRESHOLDS } from "../../src/domain/classification";

const last = { medium: 40, complex: 70, margin: 3 };

test("valid thresholds are accepted as given", () => {
  assert.deepEqual(resolveThresholds({ medium: 30, complex: 60, margin: 0 }, last), {
    thresholds: { medium: 30, complex: 60, margin: 0 },
    errors: [],
  });
});

test("missing values fall back to the defaults", () => {
  assert.deepEqual(resolveThresholds({}, last), { thresholds: { ...DEFAULT_THRESHOLDS }, errors: [] });
});

test("ranges are 1–98, 2–99 and 0–20; invalid input keeps the last valid values (FR-021)", () => {
  assert.deepEqual(resolveThresholds({ medium: 0, complex: 60, margin: 5 }, last), { thresholds: last, errors: ["mediumRange"] });
  assert.deepEqual(resolveThresholds({ medium: 30, complex: 100, margin: 5 }, last), { thresholds: last, errors: ["complexRange"] });
  assert.deepEqual(resolveThresholds({ medium: 30, complex: 60, margin: 21 }, last), { thresholds: last, errors: ["marginRange"] });
  assert.deepEqual(resolveThresholds({ medium: "x", complex: 60, margin: 5 }, last), { thresholds: last, errors: ["mediumRange"] });
});

test("medium must be below complex", () => {
  assert.deepEqual(resolveThresholds({ medium: 70, complex: 60, margin: 5 }, last), { thresholds: last, errors: ["order"] });
  assert.deepEqual(resolveThresholds({ medium: 60, complex: 60, margin: 5 }, last), { thresholds: last, errors: ["order"] });
});

test("unknown modes fall back to balanced", () => {
  assert.equal(resolveMode("saver"), "saver");
  assert.equal(resolveMode("turbo"), "balanced");
  assert.equal(resolveMode(undefined), "balanced");
});

// 002 FR-004, FR-005: custom-mode cells.
test("custom cells are normalised; empty cells stay empty", () => {
  assert.deepEqual(resolveCustomTable({ simple: "", medium: " OpusPlan ", complex: "opus[1m]", writing: undefined }, {}), {
    table: { medium: "opusplan", complex: "opus[1m]" },
    errors: [],
  });
});

test("an invalid cell keeps its last valid value and reports why", () => {
  const lastValid = { complex: "opus[1m]", writing: "sonnet" };
  assert.deepEqual(resolveCustomTable({ complex: "gpt-5", writing: "default", medium: "sonnet" }, lastValid), {
    table: { complex: "opus[1m]", writing: "sonnet", medium: "sonnet" },
    errors: [
      { cell: "complex", reason: "notClaude" },
      { cell: "writing", reason: "default" },
    ],
  });
});

test("custom is a valid mode", () => {
  assert.equal(resolveMode("custom"), "custom");
});

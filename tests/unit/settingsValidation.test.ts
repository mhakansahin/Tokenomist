import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMode, resolveThresholds } from "../../src/domain/settingsValidation";
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantModel, estimateSavings } from "../../src/domain/savings";
import { modelInfo } from "../../src/domain/modelValue";
import { MODE_MAPPING } from "../../src/domain/classification";
import { LEVELS } from "../../src/domain/types";

const T0 = "2026-11-03T10:00:00.000Z";
const at = (minutes: number) => new Date(Date.parse(T0) + minutes * 60_000).toISOString();

test("weights relative to Opus (001 research.md R9)", () => {
  assert.deepEqual(
    ["haiku", "sonnet", "opus"].map((m) => modelInfo(m).weight),
    [0.2, 0.6, 1],
  );
});

test("a single segment saves 1 − weight", () => {
  assert.deepEqual(estimateSavings([{ model: "opus", from: T0 }], at(60)), { pct: 0, unknown: false });
  assert.deepEqual(estimateSavings([{ model: "sonnet", from: T0 }], at(60)), { pct: 40, unknown: false });
  assert.deepEqual(estimateSavings([{ model: "haiku", from: T0 }], at(60)), { pct: 80, unknown: false });
});

test("several segments are weighted by duration; the open one ends at completion", () => {
  const segments = [
    { model: "opus", from: T0, to: at(30) },
    { model: "haiku", from: at(30) },
  ];
  assert.equal(estimateSavings(segments, at(120)).pct, 60); // 30 min at 0 %, 90 min at 80 %
  assert.equal(dominantModel(segments, at(120)), "haiku");
  assert.equal(dominantModel(segments, at(40)), "opus");
});

test("zero-length segments fall back to the last model", () => {
  assert.equal(estimateSavings([{ model: "sonnet", from: T0, to: T0 }], T0).pct, 40);
  assert.equal(dominantModel([{ model: "sonnet", from: T0, to: T0 }], T0), "sonnet");
});

test("SC-006: balanced mode over an even simple/medium/complex mix saves ≥ 40 % on average", () => {
  const perLevel = LEVELS.map((level) => estimateSavings([{ model: MODE_MAPPING.balanced[level], from: T0 }], at(60)).pct);
  const average = perLevel.reduce((a, b) => a + b, 0) / perLevel.length;
  assert.ok(average >= 40, `average ${average}`);
});

test("002 FR-010: opusplan saves 20 %, long-context variants weigh like their family", () => {
  assert.deepEqual(estimateSavings([{ model: "opusplan", from: T0 }], at(60)), { pct: 20, unknown: false });
  assert.deepEqual(estimateSavings([{ model: "sonnet[1m]", from: T0 }], at(60)), { pct: 40, unknown: false });
});

test("002 FR-010: an unknown-cost value counts as 0 % and marks the estimate unknown", () => {
  assert.deepEqual(estimateSavings([{ model: "fable", from: T0 }], at(60)), { pct: 0, unknown: true });
  const mixed = [
    { model: "haiku", from: T0, to: at(30) },
    { model: "best", from: at(30) },
  ];
  assert.deepEqual(estimateSavings(mixed, at(60)), { pct: 40, unknown: true });
});

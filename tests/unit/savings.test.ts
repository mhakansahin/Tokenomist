import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantModel, estimateSavings, MODEL_WEIGHT } from "../../src/domain/savings";
import { MODE_MAPPING } from "../../src/domain/classification";
import { LEVELS } from "../../src/domain/types";

const T0 = "2026-11-03T10:00:00.000Z";
const at = (minutes: number) => new Date(Date.parse(T0) + minutes * 60_000).toISOString();

test("weights relative to Opus (research.md R9)", () => {
  assert.deepEqual(MODEL_WEIGHT, { haiku: 0.2, sonnet: 0.6, opus: 1 });
});

test("a single segment saves 1 − weight", () => {
  assert.equal(estimateSavings([{ model: "opus", from: T0 }], at(60)), 0);
  assert.equal(estimateSavings([{ model: "sonnet", from: T0 }], at(60)), 40);
  assert.equal(estimateSavings([{ model: "haiku", from: T0 }], at(60)), 80);
});

test("several segments are weighted by duration; the open one ends at completion", () => {
  const segments = [
    { model: "opus" as const, from: T0, to: at(30) },
    { model: "haiku" as const, from: at(30) },
  ];
  assert.equal(estimateSavings(segments, at(120)), 60); // 30 min at 0 %, 90 min at 80 %
  assert.equal(dominantModel(segments, at(120)), "haiku");
  assert.equal(dominantModel(segments, at(40)), "opus");
});

test("zero-length segments fall back to the last model", () => {
  assert.equal(estimateSavings([{ model: "sonnet", from: T0, to: T0 }], T0), 40);
  assert.equal(dominantModel([{ model: "sonnet", from: T0, to: T0 }], T0), "sonnet");
});

test("SC-006: balanced mode over an even simple/medium/complex mix saves ≥ 40 % on average", () => {
  const perLevel = LEVELS.map((level) => estimateSavings([{ model: MODE_MAPPING.balanced[level], from: T0 }], at(60)));
  const average = perLevel.reduce((a, b) => a + b, 0) / perLevel.length;
  assert.ok(average >= 40, `average ${average}`);
});

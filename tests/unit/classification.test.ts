import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { classify, DEFAULT_THRESHOLDS, MODE_MAPPING, recommend } from "../../src/domain/classification";
import { analyzeText } from "../../src/domain/scoring";
import { Level, LEVELS } from "../../src/domain/types";

const FIXTURES = path.resolve(__dirname, "../../../tests/fixtures/specs");

test("default thresholds are 35/65 with a margin of 5", () => {
  assert.deepEqual(DEFAULT_THRESHOLDS, { medium: 35, complex: 65, margin: 5 });
});

test("scores map to levels by threshold", () => {
  assert.deepEqual(classify(10, DEFAULT_THRESHOLDS), { level: "simple", borderlineBumped: false });
  assert.deepEqual(classify(35, DEFAULT_THRESHOLDS), { level: "medium", borderlineBumped: false });
  assert.deepEqual(classify(50, DEFAULT_THRESHOLDS), { level: "medium", borderlineBumped: false });
  assert.deepEqual(classify(65, DEFAULT_THRESHOLDS), { level: "complex", borderlineBumped: false });
});

test("a score within the margin below a threshold is bumped up (FR-008)", () => {
  assert.deepEqual(classify(30, DEFAULT_THRESHOLDS), { level: "medium", borderlineBumped: true });
  assert.deepEqual(classify(29.9, DEFAULT_THRESHOLDS), { level: "simple", borderlineBumped: false });
  assert.deepEqual(classify(60, DEFAULT_THRESHOLDS), { level: "complex", borderlineBumped: true });
  assert.deepEqual(classify(60, { medium: 35, complex: 65, margin: 0 }), { level: "medium", borderlineBumped: false });
});

test("mode mapping matches FR-020", () => {
  assert.deepEqual(MODE_MAPPING, {
    saver: { simple: "haiku", medium: "haiku", complex: "sonnet" },
    balanced: { simple: "haiku", medium: "sonnet", complex: "opus" },
    quality: { simple: "sonnet", medium: "opus", complex: "opus" },
  });
  assert.equal(recommend(70, "balanced", DEFAULT_THRESHOLDS).model, "opus");
  assert.equal(recommend(70, "saver", DEFAULT_THRESHOLDS).model, "sonnet");
});

test("SC-005: labelled fixtures — ≥80% exact, never below the label", () => {
  const labels = JSON.parse(readFileSync(path.join(FIXTURES, "labels.json"), "utf8")) as Record<string, Level>;
  const entries = Object.entries(labels);
  assert.ok(entries.length >= 12, "at least 4 fixtures per level");
  let exact = 0;
  const report: string[] = [];
  for (const [file, label] of entries) {
    const analysis = analyzeText(readFileSync(path.join(FIXTURES, file), "utf8"));
    assert.ok(analysis, `${file} must be analysable`);
    const { level } = classify(analysis.score, DEFAULT_THRESHOLDS);
    report.push(`${file}: score=${analysis.score.toFixed(1)} level=${level} label=${label}`);
    assert.ok(LEVELS.indexOf(level) >= LEVELS.indexOf(label), `${file} rated below its label\n${report.join("\n")}`);
    if (level === label) {
      exact++;
    }
  }
  assert.ok(exact / entries.length >= 0.8, `only ${exact}/${entries.length} exact\n${report.join("\n")}`);
});

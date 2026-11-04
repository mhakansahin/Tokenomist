// 002 analyze I1: the settings-schema pattern only checks the shape and must never reject a value
// that parseModelValue accepts. It also must not use inline regex flags (unsupported in VS Code 1.94).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { parseModelValue } from "../../src/domain/modelValue";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"));
const props = pkg.contributes.configuration.properties as Record<string, { pattern?: string; default?: string }>;
const CELLS = ["simple", "medium", "complex", "writing"].map((c) => `tokenomist.custom.${c}`);

const CANDIDATES = [
  "", "haiku", "sonnet", "opus", "fable", "best", "opusplan", "sonnet[1m]", "opus[1m]", "fable[1m]",
  "claude-opus-5-5", "claude-sonnet-5-5[1m]", " Claude-Opus-5-5 ", "Opus[1M]", "claude-3-5-haiku-20241022",
];

test("every custom cell declares the same pattern, without inline flags", () => {
  const patterns = new Set(CELLS.map((key) => props[key]?.pattern));
  assert.equal(patterns.size, 1);
  const [pattern] = [...patterns];
  assert.ok(pattern, "pattern present");
  assert.ok(!pattern.includes("(?i"), "no inline flags");
  for (const key of CELLS) {
    assert.equal(props[key].default, "");
  }
});

test("the pattern never rejects a value the runtime accepts", () => {
  const pattern = new RegExp(props[CELLS[0]].pattern!);
  for (const value of CANDIDATES) {
    const accepted = value.trim() === "" || parseModelValue(value).ok;
    if (accepted) {
      assert.ok(pattern.test(value), JSON.stringify(value));
    }
  }
});

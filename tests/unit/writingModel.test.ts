import { test } from "node:test";
import assert from "node:assert/strict";
import { writingModelFor } from "../../src/domain/classification";

test("spec writing uses Sonnet unless it follows the mode (FR-003)", () => {
  for (const mode of ["saver", "balanced", "quality"] as const) {
    assert.equal(writingModelFor(mode, false), "sonnet", mode);
  }
  assert.equal(writingModelFor("saver", true), "haiku");
  assert.equal(writingModelFor("balanced", true), "sonnet");
  assert.equal(writingModelFor("quality", true), "opus");
});

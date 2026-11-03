import { test } from "node:test";
import assert from "node:assert/strict";
import { detect, DetectionInputs } from "../../src/app/claudeDetector";

const base: DetectionInputs = { extensionInstalled: true, env: {}, extensionEnv: [], managedSettingsText: undefined };

test("not installed wins over everything else", () => {
  assert.deepEqual(detect({ ...base, extensionInstalled: false, env: { ANTHROPIC_MODEL: "opus" } }), { installed: false });
});

test("installed without overrides is active", () => {
  assert.deepEqual(detect(base), { installed: true });
});

test("ANTHROPIC_MODEL in the environment or extension env pins the model", () => {
  assert.equal(detect({ ...base, env: { ANTHROPIC_MODEL: "opus" } }).overriddenBy, "env");
  assert.equal(
    detect({ ...base, extensionEnv: [{ name: "ANTHROPIC_MODEL", value: "opus" }] }).overriddenBy,
    "extensionEnv",
  );
});

test("managed model or availableModels pins the model; unreadable managed file does not", () => {
  assert.equal(detect({ ...base, managedSettingsText: '{"model":"opus"}' }).overriddenBy, "managed");
  assert.equal(detect({ ...base, managedSettingsText: '{"availableModels":["opus"]}' }).overriddenBy, "managed");
  assert.deepEqual(detect({ ...base, managedSettingsText: "not json" }), { installed: true });
});

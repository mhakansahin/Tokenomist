// 005 research R6: Tokenomist's model line in a skill/command definition.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasTokenomistModel, withModel } from "../../src/domain/skillFrontmatter";

const SKILL = ["---", 'name: "speckit-plan"', 'description: "Plan"', "---", "", "Body text", ""].join("\n");

test("adds the model line at the end of the frontmatter", () => {
  assert.equal(
    withModel(SKILL, "haiku"),
    ["---", 'name: "speckit-plan"', 'description: "Plan"', 'model: "haiku" # tokenomist', "---", "", "Body text", ""].join("\n"),
  );
});

test("replaces a user's model line and updates its own line", () => {
  const user = SKILL.replace('description: "Plan"', 'model: sonnet\ndescription: "Plan"');
  const once = withModel(user, "opus[1m]");
  assert.ok(once.includes('model: "opus[1m]" # tokenomist'));
  assert.ok(!once.includes("model: sonnet"));
  const twice = withModel(once, "haiku");
  assert.equal(twice.match(/^model:/gm)?.length, 1);
  assert.ok(twice.includes('model: "haiku" # tokenomist'));
});

test("ignores nested keys that merely end in 'model'", () => {
  const nested = SKILL.replace('description: "Plan"', 'metadata:\n  model: x\ndescription: "Plan"');
  const out = withModel(nested, "haiku");
  assert.ok(out.includes("  model: x"), "nested key untouched");
  assert.ok(out.includes('model: "haiku" # tokenomist'));
});

test("creates a frontmatter when there is none", () => {
  assert.equal(withModel("# Command\nDo it.\n", "sonnet"), '---\nmodel: "sonnet" # tokenomist\n---\n# Command\nDo it.\n');
});

test("keeps CRLF line endings", () => {
  const crlf = SKILL.replace(/\n/g, "\r\n");
  const out = withModel(crlf, "haiku");
  assert.ok(out.includes('model: "haiku" # tokenomist\r\n---\r\n'));
  assert.ok(!/[^\r]\n/.test(out), "no bare LF");
});

test("recognises Tokenomist's line", () => {
  assert.equal(hasTokenomistModel(SKILL), false);
  assert.equal(hasTokenomistModel(withModel(SKILL, "haiku")), true);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeText, extractSignals, SATURATION, scoreSignals, WEIGHTS } from "../../src/domain/scoring";

const sample = [
  "# Feature Specification: Sample",
  "### User Story 1 - A (Priority: P1)",
  "### User Story 2 - B (Priority: P2)",
  "### Edge Cases",
  "- What if one?",
  "- What if two?",
  "  - nested detail is not an edge case",
  "## Requirements",
  "### Functional Requirements",
  "- **FR-001**: System MUST call the payment API.",
  "- **FR-002**: System MUST send a webhook. [NEEDS CLARIFICATION: retries?]",
  "- **FR-002**: duplicate id is counted once",
  "- **FR-003**: System MUST store rows in the database. Timeout is TBD.",
  "### Key Entities",
  "- **Order**: id",
  "- **Payment**: amount",
  "## Success Criteria",
  "- SC-001: rapid, apiary and paymentless do not count",
].join("\n");

test("extracts every signal from the Spec Kit layout", () => {
  assert.deepEqual(extractSignals(sample), {
    requirements: 3,
    stories: 2,
    entities: 2,
    integrations: 4, // api, payment, webhook, database
    ambiguities: 2, // NEEDS CLARIFICATION + TBD
    edgeCases: 2,
  });
});

test("weights and saturation follow research.md R8", () => {
  assert.deepEqual(WEIGHTS, { requirements: 2, stories: 4, entities: 3, integrations: 5, ambiguities: 4, edgeCases: 1.5 });
  assert.deepEqual(SATURATION, { requirements: 25, stories: 6, entities: 8, integrations: 6, ambiguities: 5, edgeCases: 12 });
});

test("score is 0–100 and saturates", () => {
  const zero = { requirements: 0, stories: 0, entities: 0, integrations: 0, ambiguities: 0, edgeCases: 0 };
  assert.equal(scoreSignals(zero).score, 0);
  const huge = { requirements: 999, stories: 999, entities: 999, integrations: 999, ambiguities: 999, edgeCases: 999 };
  assert.equal(scoreSignals(huge).score, 100);
});

test("reasons are the top three non-zero contributions, strongest first", () => {
  const { reasons } = scoreSignals({ requirements: 10, stories: 1, entities: 0, integrations: 3, ambiguities: 0, edgeCases: 1 });
  assert.deepEqual(reasons, ["requirements", "integrations", "stories"]);
});

test("a spec without requirements and stories is unavailable", () => {
  assert.equal(analyzeText(""), undefined);
  assert.equal(analyzeText("# Title\n\nSome prose only."), undefined);
  assert.ok(analyzeText(sample));
});

test("a 1 MB spec is analysed in under 50 ms", () => {
  const big = (sample + "\n").repeat(Math.ceil(1_000_000 / sample.length));
  analyzeText(big); // warm-up
  const started = performance.now();
  analyzeText(big);
  assert.ok(performance.now() - started < 50, "analysis too slow");
});

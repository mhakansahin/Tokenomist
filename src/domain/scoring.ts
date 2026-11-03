// Local, rule-based complexity scoring of a Spec Kit spec (FR-004, FR-006, FR-009; research.md R8).
// No model calls, deterministic, linear in the size of the text.

import { SignalName, Signals } from "./types";

export const WEIGHTS: Readonly<Signals> = {
  requirements: 2,
  stories: 4,
  entities: 3,
  integrations: 5,
  ambiguities: 4,
  edgeCases: 1.5,
};

export const SATURATION: Readonly<Signals> = {
  requirements: 25,
  stories: 6,
  entities: 8,
  integrations: 6,
  ambiguities: 5,
  edgeCases: 12,
};

const SIGNAL_NAMES = Object.keys(WEIGHTS) as SignalName[];
const MAX_SCORE = SIGNAL_NAMES.reduce((sum, s) => sum + WEIGHTS[s] * SATURATION[s], 0);

// One entry per integration concept; a concept counts once per spec, whichever language names it.
// English terms need a word boundary on both sides; Turkish stems accept suffixes ("veritabanına").
const L = "\\p{L}";
const word = (alternatives: string) => new RegExp(`(?<![${L}\\d])(?:${alternatives})(?![${L}])`, "iu");
const stem = (alternatives: string) => new RegExp(`(?<![${L}\\d])(?:${alternatives})`, "iu");
const INTEGRATION_CONCEPTS: ReadonlyArray<readonly RegExp[]> = [
  [word("api|apis")],
  [word("integration|integrations|integrate|integrates"), stem("entegrasyon")],
  [word("webhook|webhooks")],
  [word("oauth|oauth2|sso|openid")],
  [word("payment|payments|stripe|iyzico|paypal"), stem("ödeme")],
  [word("database|databases"), stem("veritaban")],
  [word("queue|queues|message broker"), stem("kuyruk")],
  [word("third[- ]party"), stem("üçüncü taraf")],
  [word("e-?mail"), stem("e-?posta")],
  [word("sms")],
  [word("push notifications?"), stem("push bildirim")],
  [word("maps service|geocoding")],
  [word("object storage|blob storage|s3|cdn")],
  [word("websockets?|real[- ]time"), stem("gerçek zamanl")],
  [word("erp|crm|graphql")],
];

const FR_ID = /\*\*FR-(\d+)\*\*/g;
const STORY = /^#{2,4}\s+User Story\b/i;
const HEADING = /^(#{1,6})\s+(.*)$/;
const TOP_BULLET = /^[-*]\s+\S/;
const AMBIGUITY = /\[NEEDS CLARIFICATION|(?<![\p{L}])TBD(?![\p{L}])|\?\?\?/giu;

export function extractSignals(markdown: string): Signals {
  const requirementIds = new Set<string>();
  let stories = 0;
  let entities = 0;
  let edgeCases = 0;
  let section: "entities" | "edgeCases" | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    for (const match of line.matchAll(FR_ID)) {
      requirementIds.add(match[1]);
    }
    const heading = HEADING.exec(line);
    if (heading) {
      if (STORY.test(line)) {
        stories++;
      }
      const title = heading[2].toLowerCase();
      section = title.startsWith("key entities") ? "entities" : title.startsWith("edge cases") ? "edgeCases" : undefined;
      continue;
    }
    if (section && TOP_BULLET.test(line)) {
      if (section === "entities") {
        entities++;
      } else {
        edgeCases++;
      }
    }
  }

  return {
    requirements: requirementIds.size,
    stories,
    entities,
    integrations: INTEGRATION_CONCEPTS.filter((terms) => terms.some((t) => t.test(markdown))).length,
    ambiguities: (markdown.match(AMBIGUITY) ?? []).length,
    edgeCases,
  };
}

export function scoreSignals(signals: Signals): { score: number; reasons: SignalName[] } {
  const contributions = SIGNAL_NAMES.map((name) => ({
    name,
    value: WEIGHTS[name] * Math.min(Math.max(signals[name], 0), SATURATION[name]),
  }));
  const total = contributions.reduce((sum, c) => sum + c.value, 0);
  const reasons = contributions
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((c) => c.name);
  return { score: Math.round((total / MAX_SCORE) * 1000) / 10, reasons };
}

/** Returns undefined when the text does not look like a spec (FR edge case: unreadable/empty spec). */
export function analyzeText(markdown: string): { signals: Signals; score: number; reasons: SignalName[] } | undefined {
  const signals = extractSignals(markdown);
  if (signals.requirements + signals.stories === 0) {
    return undefined;
  }
  return { signals, ...scoreSignals(signals) };
}

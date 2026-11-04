// The single source of truth for which Claude model values Tokenomist accepts (002 FR-003–FR-005,
// research.md R3), how they are shown, how much they weigh (R4) and when two of them match (R1).

/**
 * A normalised value Claude Code accepts for `model`, e.g. "opus", "opus[1m]", "opusplan" or
 * "claude-opus-5-5". Only `parseModelValue` produces new values; stored records may hold any value
 * it once returned (the 001 aliases are valid values).
 */
export type ModelValue = string;

export type ModelFamily = "haiku" | "sonnet" | "opus" | "fable";

export type ParseFailure = "empty" | "default" | "notClaude" | "unknownVariant";

export interface ModelInfo {
  kind: "alias" | "long" | "plan" | "fullId";
  /** undefined for `opusplan`, `best` and full ids without exactly one known family. */
  family: ModelFamily | undefined;
  longContext: boolean;
  displayName: string;
  /** Usage relative to Opus (= 1). */
  weight: number;
  /** false when Tokenomist does not know the cost; savings are then reported as unknown. */
  savingsKnown: boolean;
  /** Billed from usage credits outside the subscription limit (research.md R2). */
  usesCredits: boolean;
}

const FAMILIES: readonly ModelFamily[] = ["haiku", "sonnet", "opus", "fable"];
const ALIASES = new Set(["haiku", "sonnet", "opus", "fable", "best"]);
const LONG = /^(sonnet|opus|fable)\[1m\]$/;
const FULL_ID = /^claude-[a-z0-9.-]+(\[1m\])?$/;
const KNOWN_BASE = /^(haiku|sonnet|opus|fable|best|opusplan|claude-)/;

const KNOWN_WEIGHT: Readonly<Partial<Record<ModelFamily, number>>> = { haiku: 0.2, sonnet: 0.6, opus: 1 };
const OPUSPLAN_WEIGHT = 0.8;

export function parseModelValue(raw: unknown): { ok: true; value: ModelValue } | { ok: false; reason: ParseFailure } {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "") {
    return { ok: false, reason: "empty" };
  }
  if (value === "default") {
    return { ok: false, reason: "default" };
  }
  if (ALIASES.has(value) || value === "opusplan" || LONG.test(value) || FULL_ID.test(value)) {
    return { ok: true, value };
  }
  return { ok: false, reason: KNOWN_BASE.test(value) ? "unknownVariant" : "notClaude" };
}

export function isModelValue(raw: unknown): raw is ModelValue {
  return parseModelValue(raw).ok && raw === (raw as string).trim().toLowerCase();
}

export function modelInfo(value: ModelValue): ModelInfo {
  const longContext = value.endsWith("[1m]");
  const base = longContext ? value.slice(0, -"[1m]".length) : value;
  if (value === "opusplan") {
    return info("plan", undefined, false, "Opus Plan", OPUSPLAN_WEIGHT, true, false);
  }
  if (value === "best") {
    return info("alias", undefined, false, "Best", 1, false, true);
  }
  const kind = value.startsWith("claude-") ? "fullId" : longContext ? "long" : "alias";
  const family = kind === "fullId" ? familyOf(base) : (base as ModelFamily);
  const weight = family ? KNOWN_WEIGHT[family] : undefined;
  const displayName =
    kind === "fullId" ? value : `${capitalize(base)}${longContext ? " 1M" : ""}`;
  return info(kind, family, longContext, displayName, weight ?? 1, weight !== undefined, family === "fable");
}

/**
 * Whether a model the session asks for keeps the lock (FR-009, research.md R1). `requested` is the
 * hook's `requested_model` (carries `[1m]`); without a usable one, only the family of `toModel` is
 * known, so a lock on a context variant or on `opusplan` cannot be confirmed.
 */
export function compatible(locked: ModelValue, requested: string | null | undefined, toModel?: string | null): boolean {
  const lock = modelInfo(locked);
  const parsed = parseModelValue(requested);
  if (parsed.ok) {
    if (parsed.value === locked) {
      return true;
    }
    const req = modelInfo(parsed.value);
    if (lock.kind === "plan" || req.kind === "plan") {
      return false;
    }
    return lock.family !== undefined && req.family === lock.family && req.longContext === lock.longContext;
  }
  if (lock.kind === "plan" || lock.longContext || lock.family === undefined) {
    return false;
  }
  return familyOf(toModel ?? "") === lock.family;
}

/** The family named in a full model id, if exactly one appears ("claude-3-5-haiku-…" → haiku). */
export function familyOf(id: string): ModelFamily | undefined {
  const lower = id.toLowerCase();
  const found = FAMILIES.filter((f) => lower.includes(f));
  return found.length === 1 ? found[0] : undefined;
}

function info(
  kind: ModelInfo["kind"],
  family: ModelFamily | undefined,
  longContext: boolean,
  displayName: string,
  weight: number,
  savingsKnown: boolean,
  usesCredits: boolean,
): ModelInfo {
  return { kind, family, longContext, displayName, weight, savingsKnown, usesCredits };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

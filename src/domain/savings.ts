// Estimated limit savings against "everything with Opus" (001 FR-018, 002 FR-010; research.md R4).

import { modelInfo } from "./modelValue";
import { LockSegment, ModelValue } from "./types";

export interface SavingsEstimate {
  /** Percentage 0–100, weighted by how long each lock segment lasted. */
  pct: number;
  /** A segment used a value whose cost Tokenomist does not know (counted as 0 %). */
  unknown: boolean;
}

/** Open segments end at `end`. */
export function estimateSavings(segments: readonly LockSegment[], end: string): SavingsEstimate {
  const unknown = segments.some((s) => !modelInfo(s.model).savingsKnown);
  const durations = withDurations(segments, end);
  const total = durations.reduce((sum, d) => sum + d.ms, 0);
  if (total === 0) {
    const last = segments.at(-1);
    return { pct: last ? round((1 - modelInfo(last.model).weight) * 100) : 0, unknown };
  }
  const weighted = durations.reduce((sum, d) => sum + (1 - modelInfo(d.model).weight) * d.ms, 0);
  return { pct: round((weighted / total) * 100), unknown };
}

/** The model that was locked for the longest time. */
export function dominantModel(segments: readonly LockSegment[], end: string): ModelValue | undefined {
  const totals = new Map<ModelValue, number>();
  for (const d of withDurations(segments, end)) {
    totals.set(d.model, (totals.get(d.model) ?? 0) + d.ms);
  }
  let best: ModelValue | undefined = segments.at(-1)?.model;
  for (const [model, ms] of totals) {
    if (ms > (best ? totals.get(best) ?? 0 : -1)) {
      best = model;
    }
  }
  return best;
}

function withDurations(segments: readonly LockSegment[], end: string): Array<{ model: ModelValue; ms: number }> {
  return segments.map((s) => ({ model: s.model, ms: Math.max(0, Date.parse(s.to ?? end) - Date.parse(s.from)) }));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

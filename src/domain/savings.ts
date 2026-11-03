// Estimated limit savings against "everything with Opus" (FR-018, research.md R9).

import { LockSegment, Model } from "./types";

/** Relative usage weight per model, from list-price ratios (Opus = 1). */
export const MODEL_WEIGHT: Readonly<Record<Model, number>> = { haiku: 0.2, sonnet: 0.6, opus: 1 };

/** Percentage 0–100, weighted by how long each lock segment lasted; open segments end at `end`. */
export function estimateSavings(segments: readonly LockSegment[], end: string): number {
  const durations = withDurations(segments, end);
  const total = durations.reduce((sum, d) => sum + d.ms, 0);
  if (total === 0) {
    const last = segments.at(-1);
    return last ? round((1 - MODEL_WEIGHT[last.model]) * 100) : 0;
  }
  const weighted = durations.reduce((sum, d) => sum + (1 - MODEL_WEIGHT[d.model]) * d.ms, 0);
  return round((weighted / total) * 100);
}

/** The model that was locked for the longest time. */
export function dominantModel(segments: readonly LockSegment[], end: string): Model | undefined {
  const totals = new Map<Model, number>();
  for (const d of withDurations(segments, end)) {
    totals.set(d.model, (totals.get(d.model) ?? 0) + d.ms);
  }
  let best: Model | undefined = segments.at(-1)?.model;
  for (const [model, ms] of totals) {
    if (ms > (best ? totals.get(best) ?? 0 : -1)) {
      best = model;
    }
  }
  return best;
}

function withDurations(segments: readonly LockSegment[], end: string): Array<{ model: Model; ms: number }> {
  return segments.map((s) => ({ model: s.model, ms: Math.max(0, Date.parse(s.to ?? end) - Date.parse(s.from)) }));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

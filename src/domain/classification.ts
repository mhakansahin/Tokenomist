// Thresholds, borderline bump and mode mapping (FR-005, FR-008, FR-020).

import { Level, Mode, Model } from "./types";

export interface Thresholds {
  medium: number;
  complex: number;
  margin: number;
}

export const DEFAULT_THRESHOLDS: Readonly<Thresholds> = { medium: 35, complex: 65, margin: 5 };

export const MODE_MAPPING: Readonly<Record<Mode, Readonly<Record<Level, Model>>>> = {
  saver: { simple: "haiku", medium: "haiku", complex: "sonnet" },
  balanced: { simple: "haiku", medium: "sonnet", complex: "opus" },
  quality: { simple: "sonnet", medium: "opus", complex: "opus" },
};

/** "Şüphede güçlü model": a score within `margin` below a threshold moves up one level. */
export function classify(score: number, t: Thresholds): { level: Level; borderlineBumped: boolean } {
  if (score >= t.complex) {
    return { level: "complex", borderlineBumped: false };
  }
  if (score >= t.medium) {
    return t.margin > 0 && score >= t.complex - t.margin
      ? { level: "complex", borderlineBumped: true }
      : { level: "medium", borderlineBumped: false };
  }
  return t.margin > 0 && score >= t.medium - t.margin
    ? { level: "medium", borderlineBumped: true }
    : { level: "simple", borderlineBumped: false };
}

export function recommend(
  score: number,
  mode: Mode,
  t: Thresholds,
): { level: Level; borderlineBumped: boolean; model: Model } {
  const result = classify(score, t);
  return { ...result, model: MODE_MAPPING[mode][result.level] };
}

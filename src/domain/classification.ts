// Thresholds, borderline bump and mode mapping (FR-005, FR-008, FR-020).

import { Level, Mode, Model, ModelValue, PresetMode } from "./types";

export interface Thresholds {
  medium: number;
  complex: number;
  margin: number;
}

export const DEFAULT_THRESHOLDS: Readonly<Thresholds> = { medium: 35, complex: 65, margin: 5 };

export const MODE_MAPPING: Readonly<Record<PresetMode, Readonly<Record<Level, Model>>>> = {
  saver: { simple: "haiku", medium: "haiku", complex: "sonnet" },
  balanced: { simple: "haiku", medium: "sonnet", complex: "opus" },
  quality: { simple: "sonnet", medium: "opus", complex: "opus" },
};

// `custom` follows `balanced` when the spec-writing cell is empty (002 FR-002, analyze U1).
const MODE_WRITING_MODEL: Readonly<Record<Mode, Model>> = { saver: "haiku", balanced: "sonnet", quality: "opus", custom: "sonnet" };

/** FR-003: Sonnet while the spec is written, or the mode's model when the user opts in. */
export function writingModelFor(mode: Mode, followMode: boolean): Model {
  return followMode ? MODE_WRITING_MODEL[mode] : "sonnet";
}

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

/** Per-level cells of the custom mode; an empty cell uses `balanced` (002 FR-001). */
export interface CustomTable {
  simple?: ModelValue;
  medium?: ModelValue;
  complex?: ModelValue;
  writing?: ModelValue;
}

/** The only place that reads MODE_MAPPING by mode (002 analyze U2). */
export function resolveMapping(mode: Mode, custom: CustomTable = {}): Readonly<Record<Level, ModelValue>> {
  if (mode !== "custom") {
    return MODE_MAPPING[mode];
  }
  const base = MODE_MAPPING.balanced;
  return { simple: custom.simple ?? base.simple, medium: custom.medium ?? base.medium, complex: custom.complex ?? base.complex };
}

export function recommend(
  score: number,
  mode: Mode,
  t: Thresholds,
  custom: CustomTable = {},
): { level: Level; borderlineBumped: boolean; model: ModelValue } {
  const result = classify(score, t);
  return { ...result, model: resolveMapping(mode, custom)[result.level] };
}

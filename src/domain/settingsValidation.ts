// Validation of the user's mode and threshold settings (FR-020, FR-021; data-model.md ModeSettings).

import { CustomTable, DEFAULT_THRESHOLDS, Thresholds } from "./classification";
import { parseModelValue, ParseFailure } from "./modelValue";
import { Mode, MODES } from "./types";

export type ThresholdError = "mediumRange" | "complexRange" | "marginRange" | "order";

export interface RawThresholds {
  medium?: unknown;
  complex?: unknown;
  margin?: unknown;
}

/** Invalid input is rejected as a whole; the engine keeps using `lastValid`. */
export function resolveThresholds(raw: RawThresholds, lastValid: Thresholds): { thresholds: Thresholds; errors: ThresholdError[] } {
  const medium = raw.medium ?? DEFAULT_THRESHOLDS.medium;
  const complex = raw.complex ?? DEFAULT_THRESHOLDS.complex;
  const margin = raw.margin ?? DEFAULT_THRESHOLDS.margin;
  const errors: ThresholdError[] = [];
  if (!inRange(medium, 1, 98)) {
    errors.push("mediumRange");
  }
  if (!inRange(complex, 2, 99)) {
    errors.push("complexRange");
  }
  if (!inRange(margin, 0, 20)) {
    errors.push("marginRange");
  }
  if (errors.length === 0 && (medium as number) >= (complex as number)) {
    errors.push("order");
  }
  return errors.length > 0
    ? { thresholds: { ...lastValid }, errors }
    : { thresholds: { medium: medium as number, complex: complex as number, margin: margin as number }, errors };
}

export type CustomCell = keyof CustomTable;
export const CUSTOM_CELLS: readonly CustomCell[] = ["simple", "medium", "complex", "writing"];

/** 002 FR-004, FR-005: valid cells are normalised, empty ones stay empty, invalid ones keep `lastValid`. */
export function resolveCustomTable(
  raw: Partial<Record<CustomCell, unknown>>,
  lastValid: CustomTable,
): { table: CustomTable; errors: Array<{ cell: CustomCell; reason: ParseFailure }> } {
  const table: CustomTable = {};
  const errors: Array<{ cell: CustomCell; reason: ParseFailure }> = [];
  for (const cell of CUSTOM_CELLS) {
    const parsed = parseModelValue(raw[cell]);
    if (parsed.ok) {
      table[cell] = parsed.value;
    } else if (parsed.reason !== "empty") {
      errors.push({ cell, reason: parsed.reason });
      if (lastValid[cell]) {
        table[cell] = lastValid[cell];
      }
    }
  }
  return { table, errors };
}

export function resolveMode(raw: unknown): Mode {
  return (MODES as readonly unknown[]).includes(raw) ? (raw as Mode) : "balanced";
}

function inRange(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

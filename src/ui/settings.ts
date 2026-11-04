// Reads and validates Tokenomist's VS Code settings (001 FR-020, FR-021, FR-003; 002 FR-001–FR-005, FR-013).
import * as vscode from "vscode";
import type { TrackerSettings } from "../app/tracker";
import { CustomTable, DEFAULT_THRESHOLDS, Thresholds, writingValueFor } from "../domain/classification";
import { ParseFailure } from "../domain/modelValue";
import { CustomCell, resolveCustomTable, resolveMode, resolveThresholds, ThresholdError } from "../domain/settingsValidation";
import { levelLabel } from "./labels";

let lastValidThresholds: Thresholds = { ...DEFAULT_THRESHOLDS };
let lastValidCustom: CustomTable = {};

/** Invalid values are reported (when `warn`) and the last valid ones stay in use. */
export function readSettings(options: { warn?: boolean } = {}): TrackerSettings {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const mode = resolveMode(config.get("mode"));
  const thresholds = resolveThresholds(
    { medium: config.get("thresholds.medium"), complex: config.get("thresholds.complex"), margin: config.get("borderlineMargin") },
    lastValidThresholds,
  );
  const custom = readCustomTable();
  if (thresholds.errors.length === 0) {
    lastValidThresholds = thresholds.thresholds;
  }
  if (options.warn) {
    const messages = [
      ...thresholds.errors.map(thresholdErrorText),
      ...custom.errors.map((e) => invalidValueText(e.reason, cellLabel(e.cell))),
    ];
    if (messages.length > 0) {
      void vscode.window.showErrorMessage(messages.join(" "));
    }
  }
  return {
    mode,
    thresholds: thresholds.thresholds,
    writingModel: writingValueFor(mode, config.get<boolean>("writingModel.followMode") === true, custom.table),
    custom: custom.table,
  };
}

export function readCustomTable(): { table: CustomTable; errors: Array<{ cell: CustomCell; reason: ParseFailure }> } {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const result = resolveCustomTable(
    {
      simple: config.get("custom.simple"),
      medium: config.get("custom.medium"),
      complex: config.get("custom.complex"),
      writing: config.get("custom.writing"),
    },
    lastValidCustom,
  );
  lastValidCustom = result.table;
  return result;
}

export function cellLabel(cell: CustomCell): string {
  return cell === "writing" ? vscode.l10n.t("Spec writing") : levelLabel(cell);
}

/** 002 FR-004: why a value was rejected. `where` names the cell when there is one. */
export function invalidValueText(reason: ParseFailure, where?: string): string {
  const prefix = where ? `${where}: ` : "";
  switch (reason) {
    case "empty":
      return prefix + vscode.l10n.t("Enter a Claude model value.");
    case "default":
      return prefix + vscode.l10n.t("'default' is not a model; leave the field empty to use the Balanced value.");
    case "notClaude":
      return prefix + vscode.l10n.t("Only Claude models are allowed (for example opus, opus[1m], opusplan or claude-opus-5-5).");
    case "unknownVariant":
      return prefix + vscode.l10n.t("Claude Code does not know this variant. Allowed: sonnet[1m], opus[1m], fable[1m] or a claude-… id.");
  }
}

function thresholdErrorText(error: ThresholdError): string {
  switch (error) {
    case "mediumRange":
      return vscode.l10n.t("The medium threshold must be between 1 and 98.");
    case "complexRange":
      return vscode.l10n.t("The complex threshold must be between 2 and 99.");
    case "marginRange":
      return vscode.l10n.t("The borderline margin must be between 0 and 20.");
    case "order":
      return vscode.l10n.t("The medium threshold must be lower than the complex threshold. The previous values stay in use.");
  }
}

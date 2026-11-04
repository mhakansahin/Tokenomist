// First-run setup: pick a mode and see which model each level gets (FR-020; quickstart S2).
import * as vscode from "vscode";
import { CustomTable, MODE_MAPPING, resolveMapping } from "../domain/classification";
import { CUSTOM_CELLS, CustomCell } from "../domain/settingsValidation";
import { ModelValue } from "../domain/types";
import { inputModelValue } from "./recommendation";
import { cellLabel, readCustomTable } from "./settings";
import { Mode, MODES } from "../domain/types";
import { levelLabel, modelLabel } from "./labels";

export function modeLabel(mode: Mode): string {
  switch (mode) {
    case "saver":
      return vscode.l10n.t("Saver");
    case "balanced":
      return vscode.l10n.t("Balanced");
    case "quality":
      return vscode.l10n.t("Quality");
    case "custom":
      return vscode.l10n.t("Custom");
  }
}

/** Ready-made values offered for custom cells (002 FR-013). */
const SUGGESTED: readonly ModelValue[] = ["haiku", "sonnet", "opus", "sonnet[1m]", "opus[1m]", "opusplan", "fable", "best"];

export function mappingText(mode: Mode, custom: CustomTable = readCustomTable().table): string {
  const m = resolveMapping(mode, custom);
  return (["simple", "medium", "complex"] as const).map((level) => `${levelLabel(level)} → ${modelLabel(m[level])}`).join(" · ");
}

interface ModeItem extends vscode.QuickPickItem {
  mode?: Mode;
  openSettings?: boolean;
}

export async function openSetup(): Promise<void> {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const current = config.get<Mode>("mode") ?? "balanced";
  const items: ModeItem[] = [
    ...MODES.map((mode) => ({
      mode,
      label: mode === current ? `$(check) ${modeLabel(mode)}` : modeLabel(mode),
      description: mode === "balanced" ? vscode.l10n.t("(default)") : undefined,
      detail: mappingText(mode),
    })),
    { label: "", kind: vscode.QuickPickItemKind.Separator },
    {
      label: `$(settings-gear) ${vscode.l10n.t("Edit thresholds and the spec-writing model in Settings")}`,
      detail: vscode.l10n.t("Use 'Reset Setting' there to go back to the defaults."),
      openSettings: true,
    },
  ];
  const picked = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t("Tokenomist: choose a mode"),
    placeHolder: vscode.l10n.t("Which model should each spec complexity level use?"),
  });
  if (picked?.openSettings) {
    await vscode.commands.executeCommand("workbench.action.openSettings", "tokenomist.");
  } else if (picked?.mode) {
    if (picked.mode === "custom" && !(await editCustomCells())) {
      return;
    }
    await config.update("mode", picked.mode, vscode.ConfigurationTarget.Global);
    void vscode.window.showInformationMessage(
      vscode.l10n.t("Tokenomist mode: {0} ({1})", modeLabel(picked.mode), mappingText(picked.mode)),
    );
  }
}

interface CellItem extends vscode.QuickPickItem {
  value?: ModelValue;
  clear?: boolean;
  typeOther?: boolean;
}

/** Walks through the four custom cells; Escape cancels without changing anything. */
async function editCustomCells(): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("tokenomist");
  const current = readCustomTable().table;
  const next: CustomTable = { ...current };
  for (const [index, cell] of CUSTOM_CELLS.entries()) {
    const value = await pickCellValue(cell, current[cell], `${index + 1}/${CUSTOM_CELLS.length}`);
    if (value === undefined) {
      return false;
    }
    next[cell] = value === "" ? undefined : value;
  }
  for (const cell of CUSTOM_CELLS) {
    await config.update(`custom.${cell}`, next[cell] ?? "", vscode.ConfigurationTarget.Global);
  }
  return true;
}

/** Resolves to a value, "" for an empty cell, or undefined when cancelled. */
async function pickCellValue(cell: CustomCell, current: ModelValue | undefined, step: string): Promise<ModelValue | "" | undefined> {
  const fallback = cell === "writing" ? "sonnet" : MODE_MAPPING.balanced[cell];
  const mark = (v: ModelValue) => (v === current ? "$(check) " : "");
  const items: CellItem[] = [
    ...SUGGESTED.map((value) => ({ value, label: `${mark(value)}${modelLabel(value)}`, description: value })),
    {
      clear: true,
      label: `${current === undefined ? "$(check) " : ""}${vscode.l10n.t("Leave empty ({0})", modelLabel(fallback))}`,
    },
    { typeOther: true, label: `$(edit) ${vscode.l10n.t("Type another value…")}` },
  ];
  const picked = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t("Custom mode {0}: {1}", step, cellLabel(cell)),
    placeHolder: current ? vscode.l10n.t("Current: {0}", current) : undefined,
    ignoreFocusOut: true,
  });
  if (!picked) {
    return undefined;
  }
  if (picked.clear) {
    return "";
  }
  return picked.typeOther ? inputModelValue(cellLabel(cell), current) : picked.value;
}

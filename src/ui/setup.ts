// First-run setup: pick a mode and see which model each level gets (FR-020; quickstart S2).
import * as vscode from "vscode";
import { resolveMapping } from "../domain/classification";
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

export function mappingText(mode: Mode): string {
  const m = resolveMapping(mode);
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
    await config.update("mode", picked.mode, vscode.ConfigurationTarget.Global);
    void vscode.window.showInformationMessage(
      vscode.l10n.t("Tokenomist mode: {0} ({1})", modeLabel(picked.mode), mappingText(picked.mode)),
    );
  }
}

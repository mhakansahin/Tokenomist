// Completion question, per-spec summary and the summary list (FR-015, FR-017, FR-019).
import * as vscode from "vscode";
import { SpecSummary } from "../domain/types";
import { levelLabel, modelLabel } from "./labels";

export async function askFinish(specName: string): Promise<"finish" | "notYet" | undefined> {
  const finish = vscode.l10n.t("Finish spec");
  const notYet = vscode.l10n.t("Not yet");
  const answer = await vscode.window.showInformationMessage(
    vscode.l10n.t("All tasks of {0} are done. Finish the spec and restore your previous model?", specName),
    finish,
    notYet,
  );
  return answer === finish ? "finish" : answer === notYet ? "notYet" : undefined;
}

export function summaryLine(summary: SpecSummary): string {
  const how = summary.manualOverride ? vscode.l10n.t("changed by hand") : vscode.l10n.t("as recommended");
  // 002 FR-010: no percentage when a locked value had no known cost.
  return summary.savingsUnknown
    ? vscode.l10n.t("{0} · {1} · {2} · no savings estimate", levelLabel(summary.level), modelLabel(summary.usedModel), how)
    : vscode.l10n.t(
        "{0} · {1} · {2} · ~{3}% estimated savings",
        levelLabel(summary.level),
        modelLabel(summary.usedModel),
        how,
        summary.estimatedSavingsPct,
      );
}

export function showSummary(summary: SpecSummary): void {
  const all = vscode.l10n.t("All summaries");
  void vscode.window
    .showInformationMessage(
      vscode.l10n.t("{0} finished. Your previous model is restored. {1}", summary.specName, summaryLine(summary)),
      all,
    )
    .then((choice) => {
      if (choice === all) {
        void vscode.commands.executeCommand("tokenomist.showSummaries");
      }
    });
}

export async function showSummaries(summaries: SpecSummary[]): Promise<void> {
  if (summaries.length === 0) {
    void vscode.window.showInformationMessage(vscode.l10n.t("No spec has been finished yet."));
    return;
  }
  await vscode.window.showQuickPick(
    summaries.map((s) => ({
      label: s.specName,
      description: s.workspaceName,
      detail: `${summaryLine(s)} · ${new Date(s.completedAt).toLocaleDateString(vscode.env.language)}`,
    })),
    { title: vscode.l10n.t("Tokenomist usage summaries"), matchOnDescription: true, matchOnDetail: true },
  );
}

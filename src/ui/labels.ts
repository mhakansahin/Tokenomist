// Localised names shared by the UI (FR-025). Messages are English; l10n/bundle.l10n.tr.json translates.
import * as vscode from "vscode";
import { Level, Model, SignalName, SpecAnalysis } from "../domain/types";
import { MODEL_LABEL } from "../app/tracker";

export function modelLabel(model: Model): string {
  return MODEL_LABEL[model];
}

export function levelLabel(level: Level | undefined): string {
  switch (level) {
    case "simple":
      return vscode.l10n.t("Simple");
    case "medium":
      return vscode.l10n.t("Medium");
    case "complex":
      return vscode.l10n.t("Complex");
    default:
      return vscode.l10n.t("Unknown");
  }
}

export function reasonLabel(signal: SignalName, analysis: SpecAnalysis): string {
  const n = analysis.signals[signal];
  switch (signal) {
    case "requirements":
      return vscode.l10n.t("{0} functional requirements", n);
    case "stories":
      return vscode.l10n.t("{0} user stories", n);
    case "entities":
      return vscode.l10n.t("{0} key entities", n);
    case "integrations":
      return vscode.l10n.t("{0} external integrations", n);
    case "ambiguities":
      return vscode.l10n.t("{0} open questions", n);
    case "edgeCases":
      return vscode.l10n.t("{0} edge cases", n);
  }
}

export function reasonsText(analysis: SpecAnalysis): string {
  const parts = analysis.reasons.map((r) => reasonLabel(r, analysis));
  if (analysis.borderlineBumped) {
    parts.push(vscode.l10n.t("borderline score, rounded up to the stronger model"));
  }
  return parts.join(" · ");
}

export function shorten(text: string, max = 28): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

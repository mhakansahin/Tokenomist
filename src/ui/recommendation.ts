// Recommendation notification, model picker and lock announcement (FR-009, FR-010, FR-011, FR-024).
import * as vscode from "vscode";
import { Model, MODELS, SpecAnalysis } from "../domain/types";
import { levelLabel, modelLabel, reasonsText } from "./labels";

export function announceRecommendation(analysis: SpecAnalysis): void {
  const review = vscode.l10n.t("Review");
  void vscode.window
    .showInformationMessage(
      vscode.l10n.t(
        "{0}: {1} spec → {2} recommended.",
        analysis.spec.name,
        levelLabel(analysis.level),
        modelLabel(analysis.recommendedModel),
      ),
      review,
    )
    .then((choice) => {
      if (choice === review) {
        void vscode.commands.executeCommand("tokenomist.showRecommendation");
      }
    });
}

interface ModelItem extends vscode.QuickPickItem {
  model: Model;
}

export async function pickModel(
  analysis: SpecAnalysis | undefined,
): Promise<{ model: Model; manualOverride: boolean } | undefined> {
  const recommended = analysis?.recommendedModel;
  const ordered = recommended ? [recommended, ...MODELS.filter((m) => m !== recommended)] : [...MODELS];
  const items: ModelItem[] = ordered.map((model) => ({
    model,
    label: model === recommended ? `$(check) ${modelLabel(model)}` : modelLabel(model),
    description: model === recommended ? vscode.l10n.t("(recommended)") : undefined,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    title: analysis
      ? vscode.l10n.t("{0} · {1} (score {2})", analysis.spec.name, levelLabel(analysis.level), analysis.score)
      : vscode.l10n.t("The spec could not be analysed — pick a model"),
    placeHolder: analysis ? reasonsText(analysis) : vscode.l10n.t("Choose the model to lock for this spec"),
    ignoreFocusOut: true,
  });
  return picked && { model: picked.model, manualOverride: picked.model !== recommended };
}

export function announceLock(model: Model, startNewConversation: () => Promise<void>): void {
  const start = vscode.l10n.t("Start new conversation");
  void vscode.window
    .showInformationMessage(
      vscode.l10n.t("Model locked to {0}. It applies to new Claude Code conversations.", modelLabel(model)),
      start,
    )
    .then((choice) => {
      if (choice === start) {
        void startNewConversation();
      }
    });
}

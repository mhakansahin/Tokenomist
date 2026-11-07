// Recommendation notification, model picker and lock announcement (FR-009, FR-010, FR-011, FR-024).
import * as vscode from "vscode";
import { parseModelValue } from "../domain/modelValue";
import { MODELS, ModelValue, SpecAnalysis } from "../domain/types";
import { levelLabel, modelLabel, reasonsText } from "./labels";
import { invalidValueText, readCustomTable } from "./settings";

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
  model?: ModelValue;
  typeOther?: boolean;
}

/** 002 FR-014: recommended → Haiku/Sonnet/Opus → custom-table values → "type another Claude model". */
export async function pickModel(
  analysis: SpecAnalysis | undefined,
): Promise<{ model: ModelValue; manualOverride: boolean } | undefined> {
  const recommended = analysis?.recommendedModel;
  const custom = readCustomTable().table;
  const values = [recommended, ...MODELS, custom.simple, custom.medium, custom.complex, custom.writing].filter(
    (v, i, all): v is ModelValue => v !== undefined && all.indexOf(v) === i,
  );
  const items: ModelItem[] = [
    ...values.map((model) => ({
      model,
      label: model === recommended ? `$(check) ${modelLabel(model)}` : modelLabel(model),
      description: model === recommended ? vscode.l10n.t("(recommended)") : model !== modelLabel(model).toLowerCase() ? model : undefined,
    })),
    { label: `$(edit) ${vscode.l10n.t("Type another Claude model…")}`, typeOther: true },
  ];
  const picked = await vscode.window.showQuickPick(items, {
    title: analysis
      ? vscode.l10n.t("{0} · {1} (score {2})", analysis.spec.name, levelLabel(analysis.level), analysis.score)
      : vscode.l10n.t("The spec could not be analysed — pick a model"),
    placeHolder: analysis ? reasonsText(analysis) : vscode.l10n.t("Choose the model to lock for this spec"),
    ignoreFocusOut: true,
  });
  const model = picked?.typeOther ? await inputModelValue(vscode.l10n.t("Claude model to lock for this spec")) : picked?.model;
  return model === undefined ? undefined : { model, manualOverride: model !== recommended };
}

/** Free-text entry validated by the same grammar as the settings (002 FR-003, FR-004). */
export async function inputModelValue(title: string, value?: string): Promise<ModelValue | undefined> {
  const raw = await vscode.window.showInputBox({
    title,
    value,
    placeHolder: "opus[1m] · opusplan · claude-opus-5-5",
    ignoreFocusOut: true,
    validateInput: (text) => {
      const parsed = parseModelValue(text);
      return parsed.ok ? undefined : invalidValueText(parsed.reason);
    },
  });
  const parsed = parseModelValue(raw);
  return parsed.ok ? parsed.value : undefined;
}

/** 004 FR-002: locked without asking; the user can still pick another model. */
export function announceAutoLock(model: ModelValue): void {
  const change = vscode.l10n.t("Change model");
  void vscode.window
    .showInformationMessage(vscode.l10n.t("Tokenomist locked {0} for this spec (automatic mode).", modelLabel(model)), change)
    .then((choice) => {
      if (choice === change) {
        void vscode.commands.executeCommand("tokenomist.changeModel");
      }
    });
}

/** 002 FR-015, research.md R2. */
export function warnAboutCredits(value: ModelValue): void {
  void vscode.window.showWarningMessage(
    vscode.l10n.t(
      "{0} is billed from usage credits outside your subscription limit, and Claude Code asks for a one-time consent in an interactive /model session.",
      modelLabel(value),
    ),
  );
}

export function announceLock(model: ModelValue, startNewConversation: () => Promise<void>): void {
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

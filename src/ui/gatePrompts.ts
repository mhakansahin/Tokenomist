// Modal questions behind the hook gates (contracts/claude-settings-and-hooks.md §2, FR-023, FR-024).
import * as vscode from "vscode";
import { Model } from "../domain/types";
import { modelLabel } from "./labels";

export async function confirmCleanup(): Promise<boolean> {
  const remove = vscode.l10n.t("Remove and restore");
  const answer = await vscode.window.showWarningMessage(
    vscode.l10n.t("A spec model is active. Remove Tokenomist from Claude Code settings and restore your original model?"),
    { modal: true },
    remove,
  );
  return answer === remove;
}

export async function askWriting(model: Model): Promise<"newConversation" | "continue" | undefined> {
  const open = vscode.l10n.t("Start in a new conversation");
  const proceed = vscode.l10n.t("Continue in this conversation");
  const answer = await vscode.window.showInformationMessage(
    vscode.l10n.t("Spec-writing model: {0}.", modelLabel(model)),
    {
      modal: true,
      detail: vscode.l10n.t("Claude Code reads the model when a conversation starts. A new conversation writes the spec with {0}.", modelLabel(model)),
    },
    open,
    proceed,
  );
  return answer === open ? "newConversation" : answer === proceed ? "continue" : undefined;
}

export async function askUnlockedPlan(recommended: Model | undefined): Promise<"approve" | "change" | "continue" | undefined> {
  const approve = recommended ? vscode.l10n.t("Lock {0} and open a new conversation", modelLabel(recommended)) : undefined;
  const change = recommended ? vscode.l10n.t("Choose another model") : vscode.l10n.t("Choose a model");
  const proceed = vscode.l10n.t("Continue without a lock");
  const buttons = [approve, change, proceed].filter((b): b is string => b !== undefined);
  const answer = await vscode.window.showWarningMessage(
    vscode.l10n.t("No model is locked for this spec yet."),
    {
      modal: true,
      detail: recommended
        ? vscode.l10n.t("Tokenomist recommends {0}. The plan should run in a conversation that uses the locked model.", modelLabel(recommended))
        : vscode.l10n.t("The spec could not be analysed; you can pick the model yourself."),
    },
    ...buttons,
  );
  return answer === approve ? "approve" : answer === change ? "change" : answer === proceed ? "continue" : undefined;
}

export async function askSessionMismatch(locked: Model): Promise<"newConversation" | "continue" | undefined> {
  const open = vscode.l10n.t("Open a new conversation");
  const proceed = vscode.l10n.t("Continue in this conversation");
  const answer = await vscode.window.showWarningMessage(
    vscode.l10n.t("This conversation may not be using the locked model {0}.", modelLabel(locked)),
    {
      modal: true,
      detail: vscode.l10n.t("Claude Code reads the model when a conversation starts. A new conversation uses the locked model."),
    },
    open,
    proceed,
  );
  return answer === open ? "newConversation" : answer === proceed ? "continue" : undefined;
}

export async function askOverride(locked: Model, target: Model | undefined): Promise<"update" | "revert" | undefined> {
  const update = target ? vscode.l10n.t("Update the lock to {0}", modelLabel(target)) : undefined;
  const revert = vscode.l10n.t("Revert");
  const buttons = [update, revert].filter((b): b is string => b !== undefined);
  const answer = await vscode.window.showWarningMessage(
    target
      ? vscode.l10n.t("The model is locked to {0} for this spec. Switch to {1}?", modelLabel(locked), modelLabel(target))
      : vscode.l10n.t("The model is locked to {0} for this spec.", modelLabel(locked)),
    { modal: true },
    ...buttons,
  );
  return answer === update ? "update" : answer === revert ? "revert" : undefined;
}

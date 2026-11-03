// Status bar item (FR-013; contracts/vscode-contributions.md "Status bar").
import * as vscode from "vscode";
import { Model, SpecTracking } from "../domain/types";
import { levelLabel, modelLabel, shorten } from "./labels";

export type PassiveCause = "claudeMissing" | "noSpecKit" | "modelOverridden" | "settingsUnreadable";

export interface StatusView {
  passive?: PassiveCause;
  gateOffline?: boolean;
  tracking?: SpecTracking;
  /** Set between /speckit-specify and the new feature directory appearing. */
  pendingWritingModel?: Model;
}

export const SHOW_STATUS_COMMAND = "tokenomist.showStatusDetails";

export class StatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem("tokenomist.status", vscode.StatusBarAlignment.Left, 50);
  private view: StatusView = {};

  constructor() {
    this.item.name = "Tokenomist";
    this.item.show();
  }

  get current(): StatusView {
    return this.view;
  }

  render(view: StatusView): void {
    this.view = view;
    const { text, tooltip, command } = describe(view);
    this.item.text = view.gateOffline && !view.passive ? `${text} $(debug-disconnect)` : text;
    this.item.tooltip = view.gateOffline ? `${tooltip}\n${vscode.l10n.t("Claude Code hooks are not reachable; prompts are not gated.")}` : tooltip;
    this.item.command = command;
  }

  dispose(): void {
    this.item.dispose();
  }
}

export function passiveExplanation(cause: PassiveCause): string {
  switch (cause) {
    case "claudeMissing":
      return vscode.l10n.t("Claude Code is not installed. Tokenomist does not change anything without it.");
    case "noSpecKit":
      return vscode.l10n.t("This workspace has no Spec Kit feature (.specify/feature.json), so Tokenomist stays passive.");
    case "modelOverridden":
      return vscode.l10n.t(
        "The Claude Code model is pinned by ANTHROPIC_MODEL or managed settings, so Tokenomist cannot choose it and stays passive.",
      );
    case "settingsUnreadable":
      return vscode.l10n.t("Tokenomist cannot read .claude/settings.local.json; fix the JSON to continue.");
  }
}

function describe(view: StatusView): { text: string; tooltip: string; command?: string } {
  if (view.passive) {
    return {
      text: `$(circle-slash) ${vscode.l10n.t("Tokenomist: passive")}`,
      tooltip: passiveExplanation(view.passive),
      command: SHOW_STATUS_COMMAND,
    };
  }
  const tracking = view.tracking;
  if (!tracking && view.pendingWritingModel) {
    return {
      text: `$(edit) Tokenomist · ${vscode.l10n.t("writing")} · ${modelLabel(view.pendingWritingModel)}`,
      tooltip: vscode.l10n.t("The spec is being written."),
    };
  }
  if (!tracking) {
    return {
      text: "$(sparkle) Tokenomist",
      tooltip: vscode.l10n.t("No spec is tracked yet. Click to analyse the active spec."),
      command: "tokenomist.analyzeSpec",
    };
  }
  const name = shorten(tracking.spec.name);
  const analysis = tracking.analysis;
  const lock = tracking.lock;
  switch (tracking.state) {
    case "writing":
      return {
        text: `$(edit) ${name} · ${vscode.l10n.t("writing")}${tracking.writingModel ? ` · ${modelLabel(tracking.writingModel)}` : ""}`,
        tooltip: vscode.l10n.t("The spec is being written."),
        command: "tokenomist.analyzeSpec",
      };
    case "awaitingApproval":
      return {
        text: `$(warning) ${name} · ${levelLabel(analysis?.level)} → ${analysis ? modelLabel(analysis.recommendedModel) : "?"}?`,
        tooltip: vscode.l10n.t("A model is recommended for this spec. Click to review and lock it."),
        command: "tokenomist.showRecommendation",
      };
    case "locked":
    case "completionPending":
      return {
        text:
          tracking.state === "locked"
            ? `$(lock) ${name} · ${levelLabel(lock?.level)} · ${lock ? modelLabel(lock.model) : "?"}`
            : `$(check) ${name} · ${vscode.l10n.t("finish?")}`,
        tooltip: vscode.l10n.t("Locked model: {0}. It applies to new Claude Code conversations.", lock ? modelLabel(lock.model) : "?"),
        command: tracking.state === "locked" ? "tokenomist.showRecommendation" : "tokenomist.finishSpec",
      };
    case "suspended":
      return { text: "$(sparkle) Tokenomist", tooltip: "", command: "tokenomist.analyzeSpec" };
  }
}

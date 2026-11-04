// What Tokenomist answers to Claude Code hook calls (contracts/claude-settings-and-hooks.md §2).
// Pure: the caller supplies the tracking context and turns "ask*" decisions into dialogs.

import * as path from "node:path";
import { familyOf } from "./modelValue";
import { ModelValue, TrackingState } from "./types";

export interface ExpansionInput {
  command_name?: string;
  cwd?: string;
  session_id?: string;
}

export interface ModelSwitchInput {
  from_model?: string | null;
  to_model?: string | null;
  source?: string;
  session_id?: string;
}

export interface GateContext {
  workspaceRoot: string;
  /** Spec-writing model from settings (FR-003). */
  writingModel: ModelValue;
  /** Last known model of the hook's session, if any (research.md R4). */
  sessionModel?: ModelValue;
  /** Tracking record of the active feature, if any. */
  tracking?: { state: TrackingState; lockedModel?: ModelValue; recommendedModel?: ModelValue };
}

export type ExpansionDecision =
  | { kind: "allow" }
  | { kind: "startWriting"; model: ModelValue }
  | { kind: "askWriting"; model: ModelValue }
  | { kind: "askUnlockedPlan"; recommendedModel: ModelValue | undefined }
  | { kind: "askSessionMismatch"; lockedModel: ModelValue };

export type ModelSwitchDecision =
  | { kind: "allow" }
  | { kind: "askOverride"; lockedModel: ModelValue; targetModel: ModelValue | undefined; persistsToUserSettings: boolean };

export type ExpansionAnswer = { kind: "allow" } | { kind: "block"; reason: string };
export type ModelSwitchAnswer = { kind: "allow" } | { kind: "deny"; message: string };

export const TIMEOUT_ANSWER = {
  expansion: { kind: "allow" } as ExpansionAnswer,
  // FR-023: the model never changes without the user's choice.
  preModelSwitch: { kind: "deny", message: "" } as ModelSwitchAnswer,
};

const LOCKED_STATES: ReadonlySet<TrackingState> = new Set(["locked", "completionPending"]);
const PHASE_COMMANDS: ReadonlySet<string> = new Set(["speckit-plan", "speckit-tasks", "speckit-implement"]);
// `/model <name>` and the picker's Enter both write `model` to ~/.claude/settings.json.
const PERSISTING_SOURCES: ReadonlySet<string> = new Set(["command", "picker"]);

export function decideExpansion(input: ExpansionInput, ctx: GateContext): ExpansionDecision {
  if (!input.cwd || !isInsideWorkspace(input.cwd, ctx.workspaceRoot)) {
    return { kind: "allow" };
  }
  const command = input.command_name ?? "";
  if (command === "speckit-specify") {
    return ctx.sessionModel === ctx.writingModel
      ? { kind: "startWriting", model: ctx.writingModel }
      : { kind: "askWriting", model: ctx.writingModel };
  }
  if (!PHASE_COMMANDS.has(command)) {
    return { kind: "allow" };
  }
  const tracking = ctx.tracking;
  const locked = tracking && LOCKED_STATES.has(tracking.state) && tracking.lockedModel;
  if (!locked) {
    return command === "speckit-plan"
      ? { kind: "askUnlockedPlan", recommendedModel: tracking?.recommendedModel }
      : { kind: "allow" };
  }
  return ctx.sessionModel === tracking.lockedModel
    ? { kind: "allow" }
    : { kind: "askSessionMismatch", lockedModel: tracking.lockedModel! };
}

export function decidePreModelSwitch(input: ModelSwitchInput, ctx: GateContext): ModelSwitchDecision {
  const tracking = ctx.tracking;
  if (!tracking || !LOCKED_STATES.has(tracking.state) || !tracking.lockedModel) {
    return { kind: "allow" };
  }
  const target = familyOf(input.to_model ?? "");
  if (target === tracking.lockedModel) {
    return { kind: "allow" };
  }
  return {
    kind: "askOverride",
    lockedModel: tracking.lockedModel,
    targetModel: target,
    persistsToUserSettings: PERSISTING_SOURCES.has(input.source ?? ""),
  };
}

export function expansionResponse(answer: ExpansionAnswer): Record<string, unknown> {
  return answer.kind === "block" ? { decision: "block", reason: answer.reason } : {};
}

export function preModelSwitchResponse(answer: ModelSwitchAnswer): Record<string, unknown> {
  const output = { hookSpecificOutput: { hookEventName: "PreModelSwitch", permissionDecision: answer.kind } };
  return answer.kind === "deny" && answer.message ? { ...output, systemMessage: answer.message } : output;
}

export function isInsideWorkspace(cwd: string, root: string, platform: NodeJS.Platform = process.platform): boolean {
  const p = platform === "win32" ? path.win32 : path.posix;
  const norm = (value: string) => {
    const resolved = p.resolve(value);
    return platform === "win32" || platform === "darwin" ? resolved.toLowerCase() : resolved;
  };
  const relative = p.relative(norm(root), norm(cwd));
  return relative === "" || (!relative.startsWith("..") && !p.isAbsolute(relative));
}

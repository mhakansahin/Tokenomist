// Claude Code presence and model-override guards (FR-001, research.md R6).
// Inputs are injected so the decision can be tested without VS Code.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { parseSettings } from "../domain/claudeSettingsDoc";

export const CLAUDE_CODE_EXTENSION_ID = "anthropic.claude-code";

export type OverrideSource = "env" | "extensionEnv" | "managed";

export interface Detection {
  installed: boolean;
  overriddenBy?: OverrideSource;
}

export interface DetectionInputs {
  extensionInstalled: boolean;
  env: NodeJS.ProcessEnv;
  /** Value of the `claudeCode.environmentVariables` VS Code setting. */
  extensionEnv: unknown;
  managedSettingsText: string | undefined;
}

export function detect(inputs: DetectionInputs): Detection {
  if (!inputs.extensionInstalled) {
    return { installed: false };
  }
  if (inputs.env.ANTHROPIC_MODEL) {
    return { installed: true, overriddenBy: "env" };
  }
  if (Array.isArray(inputs.extensionEnv) && inputs.extensionEnv.some(isModelEnvEntry)) {
    return { installed: true, overriddenBy: "extensionEnv" };
  }
  if (inputs.managedSettingsText !== undefined) {
    try {
      const managed = parseSettings(inputs.managedSettingsText);
      if (managed.model !== undefined || managed.availableModels !== undefined) {
        return { installed: true, overriddenBy: "managed" };
      }
    } catch {
      // An unreadable managed file is Claude Code's concern; it does not pin the model for us.
    }
  }
  return { installed: true };
}

export function managedSettingsPath(platform: NodeJS.Platform = process.platform): string {
  switch (platform) {
    case "win32":
      return path.join(process.env.ProgramFiles ?? "C:\\Program Files", "ClaudeCode", "managed-settings.json");
    case "darwin":
      return "/Library/Application Support/ClaudeCode/managed-settings.json";
    default:
      return "/etc/claude-code/managed-settings.json";
  }
}

export async function readManagedSettings(): Promise<string | undefined> {
  return fs.readFile(managedSettingsPath(), "utf8").catch(() => undefined);
}

function isModelEnvEntry(entry: unknown): boolean {
  return typeof entry === "object" && entry !== null && (entry as { name?: unknown }).name === "ANTHROPIC_MODEL";
}

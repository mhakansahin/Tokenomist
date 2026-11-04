// Pure transformations of Claude Code's `.claude/settings.local.json`
// (contracts/claude-settings-and-hooks.md §1). Tokenomist owns only the `model` key while a spec
// is tracked and the http hook entries whose url contains HOOK_PATH_MARKER.

import { parseModelValue } from "./modelValue";
import { KeySnapshot, ModelValue } from "./types";

export type SettingsDoc = Record<string, unknown>;

export class SettingsParseError extends Error {}

export const HOOK_PATH_MARKER = "/tokenomist/";
export const EXPANSION_MATCHER = "speckit-specify|speckit-plan|speckit-tasks|speckit-implement";
export const TOKEN_HEADER = "X-Tokenomist-Token";

interface HookHandler {
  type?: string;
  url?: string;
  [key: string]: unknown;
}

interface MatcherGroup {
  matcher?: string;
  hooks: HookHandler[];
  [key: string]: unknown;
}

// SessionStart is absent on purpose: it does not accept http hooks (research.md, Spike sonucu).
const OWNED_EVENTS: ReadonlyArray<{ event: string; path: string; matcher?: string }> = [
  { event: "UserPromptExpansion", path: "expansion", matcher: EXPANSION_MATCHER },
  { event: "PreModelSwitch", path: "pre-model-switch" },
  { event: "PostModelSwitch", path: "post-model-switch" },
];

const HOOK_TIMEOUT_SECONDS = 30;

export function parseSettings(text: string | undefined): SettingsDoc {
  if (text === undefined || text.trim() === "") {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new SettingsParseError(`settings.local.json is not valid JSON: ${(err as Error).message}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SettingsParseError("settings.local.json must contain a JSON object");
  }
  return value as SettingsDoc;
}

export function serializeSettings(doc: SettingsDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

export function isEmptySettings(doc: SettingsDoc): boolean {
  return Object.keys(doc).length === 0;
}

export function takeKeySnapshot(doc: SettingsDoc): KeySnapshot {
  return typeof doc.model === "string" ? { present: true, value: doc.model } : { present: false };
}

/** Writes a validated Claude model value exactly as given (002 FR-008, SC-005). */
export function applyModel(doc: SettingsDoc, model: ModelValue): SettingsDoc {
  const parsed = parseModelValue(model);
  if (!parsed.ok) {
    throw new Error(`Tokenomist only writes Claude model values, got: ${String(model)}`);
  }
  return { ...structuredClone(doc), model: parsed.value };
}

export function restoreModel(doc: SettingsDoc, snapshot: KeySnapshot): SettingsDoc {
  const next = structuredClone(doc);
  if (snapshot.present) {
    next.model = snapshot.value;
  } else {
    delete next.model;
  }
  return next;
}

export function removeTokenomistHooks(doc: SettingsDoc): SettingsDoc {
  const next = structuredClone(doc);
  const hooks = next.hooks;
  if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) {
    return next;
  }
  const events = hooks as Record<string, unknown>;
  for (const [event, groups] of Object.entries(events)) {
    if (!Array.isArray(groups)) {
      continue;
    }
    const kept = (groups as MatcherGroup[])
      .map((group) => {
        if (!group || !Array.isArray(group.hooks)) {
          return group;
        }
        return { ...group, hooks: group.hooks.filter((h) => !isOwnedHook(h)) };
      })
      .filter((group) => !group || !Array.isArray(group.hooks) || group.hooks.length > 0);
    if (kept.length === 0) {
      delete events[event];
    } else {
      events[event] = kept;
    }
  }
  if (Object.keys(events).length === 0) {
    delete next.hooks;
  }
  return next;
}

export function upsertTokenomistHooks(doc: SettingsDoc, port: number, token: string): SettingsDoc {
  const next = removeTokenomistHooks(doc);
  const existing = next.hooks;
  const events: Record<string, unknown> =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  for (const owned of OWNED_EVENTS) {
    const group: MatcherGroup = {
      ...(owned.matcher ? { matcher: owned.matcher } : {}),
      hooks: [
        {
          type: "http",
          url: `http://127.0.0.1:${port}${HOOK_PATH_MARKER}${owned.path}`,
          headers: { [TOKEN_HEADER]: token },
          timeout: HOOK_TIMEOUT_SECONDS,
        },
      ],
    };
    const current = events[owned.event];
    events[owned.event] = Array.isArray(current) ? [...current, group] : [group];
  }
  next.hooks = events;
  return next;
}

export function hasTokenomistEntries(doc: SettingsDoc): boolean {
  return JSON.stringify(removeTokenomistHooks(doc)) !== JSON.stringify(doc);
}

function isOwnedHook(handler: HookHandler | undefined): boolean {
  return typeof handler?.url === "string" && handler.url.includes(HOOK_PATH_MARKER);
}

// Tokenomist's `model` line in a Spec Kit skill or command definition (005 research R1, R6).
// Claude Code uses a definition's `model` for the rest of that turn only, so the conversation's own
// model never changes. Restoring is done from the saved original text, not by editing back.

import { ModelValue } from "./types";

export const MODEL_MARKER = "# tokenomist";

const TOP_LEVEL_MODEL = /^model\s*:/;

export function withModel(text: string, value: ModelValue): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `model: ${JSON.stringify(value)} ${MODEL_MARKER}`;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return `---${eol}${line}${eol}---${eol}${text}`;
  }
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (close === -1) {
    return `---${eol}${line}${eol}---${eol}${text}`;
  }
  const existing = lines.findIndex((l, i) => i > 0 && i < close && TOP_LEVEL_MODEL.test(l));
  if (existing !== -1) {
    lines[existing] = line;
  } else {
    lines.splice(close, 0, line);
  }
  return lines.join(eol);
}

export function hasTokenomistModel(text: string): boolean {
  return text.split(/\r?\n/).some((l) => TOP_LEVEL_MODEL.test(l) && l.trimEnd().endsWith(MODEL_MARKER));
}

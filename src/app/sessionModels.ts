// What model a Claude Code session is running (research.md R4). SessionStart has no http hook, so
// the model is either observed from model-switch hooks or inferred from when the session started.

import { promises as fs } from "node:fs";
import { familyOf } from "../domain/modelValue";
import { ModelValue } from "../domain/types";

const MAX_SESSIONS = 200;

export interface SessionModelInputs {
  observed?: ModelValue;
  /** Creation time of the session transcript; undefined when it does not exist yet (brand-new). */
  sessionStartedAt: number | undefined;
  /** When Tokenomist last wrote the local `model` key. */
  keyWrittenAt: number | undefined;
  keyModel: ModelValue | undefined;
}

/** Claude Code reads `model` only at session start, so a session newer than the last write runs it. */
export function resolveSessionModel(inputs: SessionModelInputs): ModelValue | undefined {
  if (inputs.observed) {
    return inputs.observed;
  }
  if (inputs.keyWrittenAt === undefined || !inputs.keyModel) {
    return undefined;
  }
  if (inputs.sessionStartedAt === undefined || inputs.sessionStartedAt >= inputs.keyWrittenAt) {
    return inputs.keyModel;
  }
  return undefined;
}

export async function transcriptCreatedAt(transcriptPath: string | undefined): Promise<number | undefined> {
  if (!transcriptPath) {
    return undefined;
  }
  const stat = await fs.stat(transcriptPath).catch(() => undefined);
  return stat ? stat.birthtimeMs || stat.ctimeMs : undefined;
}

export class SessionModels {
  private readonly models = new Map<string, ModelValue>();
  private readonly acknowledged = new Map<string, string>();

  observe(sessionId: string | undefined, modelId: string | null | undefined): void {
    const family = familyOf(modelId ?? "");
    if (!sessionId || !family) {
      return;
    }
    remember(this.models, sessionId, family);
  }

  observed(sessionId: string | undefined): ModelValue | undefined {
    return sessionId ? this.models.get(sessionId) : undefined;
  }

  /** The user already answered the gate for this session under this lock; do not ask again. */
  acknowledge(sessionId: string | undefined, lockKey: string): void {
    if (sessionId) {
      remember(this.acknowledged, sessionId, lockKey);
    }
  }

  isAcknowledged(sessionId: string | undefined, lockKey: string): boolean {
    return sessionId !== undefined && this.acknowledged.get(sessionId) === lockKey;
  }
}

function remember<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key);
  map.set(key, value);
  if (map.size > MAX_SESSIONS) {
    map.delete(map.keys().next().value as string);
  }
}

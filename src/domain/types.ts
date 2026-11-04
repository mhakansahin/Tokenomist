// Domain types shared by every layer (data-model.md). No vscode imports here.

export type Model = "haiku" | "sonnet" | "opus";
export const MODELS: readonly Model[] = ["haiku", "sonnet", "opus"];

export type Level = "simple" | "medium" | "complex";
export const LEVELS: readonly Level[] = ["simple", "medium", "complex"];

export type Mode = "saver" | "balanced" | "quality" | "custom";
export const MODES: readonly Mode[] = ["saver", "balanced", "quality", "custom"];
/** The three modes with a fixed table (001 FR-020); `custom` builds on `balanced` (002 FR-001). */
export type PresetMode = Exclude<Mode, "custom">;

export type { ModelValue } from "./modelValue";
import type { ModelValue } from "./modelValue";

export function isModel(value: unknown): value is Model {
  return typeof value === "string" && (MODELS as readonly string[]).includes(value);
}

/**
 * Hook payloads carry full model ids such as "claude-sonnet-5-5" (research.md, Spike sonucu).
 * Returns the family, or undefined when the id is missing or not recognised.
 */
export function modelFamily(id: string | null | undefined): Model | undefined {
  if (!id) {
    return undefined;
  }
  const lower = id.toLowerCase();
  const matches = MODELS.filter((m) => lower.includes(m));
  return matches.length === 1 ? matches[0] : undefined;
}

export interface SpecRef {
  workspaceRoot: string;
  featureDir: string;
  name: string;
}

export interface Signals {
  requirements: number;
  stories: number;
  entities: number;
  integrations: number;
  ambiguities: number;
  edgeCases: number;
}

export type SignalName = keyof Signals;

export interface SpecAnalysis {
  spec: SpecRef;
  specHash: string;
  signals: Signals;
  score: number;
  level: Level;
  borderlineBumped: boolean;
  recommendedModel: ModelValue;
  reasons: SignalName[];
  analyzedAt: string;
}

/** State of the `model` key in one settings file before Tokenomist touched it. */
export type KeySnapshot = { present: false } | { present: true; value: string };

export interface ModelSnapshot {
  localModel: KeySnapshot;
  userModel?: KeySnapshot;
  createdLocalFile: boolean;
  takenAt: string;
}

export interface LockSegment {
  model: ModelValue;
  from: string;
  to?: string;
}

export interface ModelLock {
  model: ModelValue;
  recommendedModel: ModelValue;
  /** Absent when the spec could not be analysed and the user picked the model by hand. */
  level?: Level;
  manualOverride: boolean;
  lockedAt: string;
  segments: LockSegment[];
}

export type TrackingState = "writing" | "awaitingApproval" | "locked" | "completionPending" | "suspended";

export interface SpecTracking {
  spec: SpecRef;
  state: TrackingState;
  /** State to return to when a suspended spec becomes active again. */
  resumeState?: Exclude<TrackingState, "suspended">;
  original?: ModelSnapshot;
  writingModel?: ModelValue;
  analysis?: SpecAnalysis;
  lock?: ModelLock;
  startedAt: string;
}

export interface PendingWriting {
  original: ModelSnapshot;
  writingModel: ModelValue;
  createdAt: string;
}

export interface SpecSummary {
  id: string;
  specName: string;
  workspaceName: string;
  level: Level;
  recommendedModel: ModelValue;
  usedModel: ModelValue;
  manualOverride: boolean;
  estimatedSavingsPct: number;
  /** Set when a locked value has no known cost (002 FR-010); older summaries lack it. */
  savingsUnknown?: true;
  startedAt: string;
  completedAt: string;
}

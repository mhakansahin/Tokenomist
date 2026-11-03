// Completed-spec summaries across all projects (FR-019) on top of VS Code's globalState.

import { SpecSummary } from "../domain/types";
import { MementoLike } from "./trackingStore";

const SUMMARIES_KEY = "tokenomist.summaries";
const MAX_SUMMARIES = 500;

export function summaryId(workspaceRoot: string, featureDir: string, completedAt: string): string {
  return `${workspaceRoot}#${featureDir}#${completedAt}`;
}

export class SummaryStore {
  constructor(private readonly memento: MementoLike) {}

  /** Newest first. */
  list(): SpecSummary[] {
    return [...(this.memento.get<SpecSummary[]>(SUMMARIES_KEY) ?? [])].reverse();
  }

  async add(summary: SpecSummary): Promise<void> {
    const stored = [...(this.memento.get<SpecSummary[]>(SUMMARIES_KEY) ?? []), summary];
    await this.memento.update(SUMMARIES_KEY, stored.slice(-MAX_SUMMARIES));
  }
}

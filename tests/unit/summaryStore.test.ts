import { test } from "node:test";
import assert from "node:assert/strict";
import { SummaryStore, summaryId } from "../../src/persistence/summaryStore";
import { SpecSummary } from "../../src/domain/types";
import { MemoryMemento } from "../integration/helpers";

const summary = (n: number): SpecSummary => ({
  id: `id-${n}`,
  specName: `spec ${n}`,
  workspaceName: "ws",
  level: "medium",
  recommendedModel: "sonnet",
  usedModel: "sonnet",
  manualOverride: false,
  estimatedSavingsPct: 40,
  startedAt: "2026-11-03T10:00:00.000Z",
  completedAt: "2026-11-03T11:00:00.000Z",
});

test("id is workspaceRoot#featureDir#completedAt", () => {
  assert.equal(summaryId("C:\\ws", "specs/001-x", "2026-11-03T11:00:00.000Z"), "C:\\ws#specs/001-x#2026-11-03T11:00:00.000Z");
});

test("lists newest first and keeps at most 500 (FIFO)", async () => {
  const store = new SummaryStore(new MemoryMemento());
  for (let n = 1; n <= 502; n++) {
    await store.add(summary(n));
  }
  const list = store.list();
  assert.equal(list.length, 500);
  assert.equal(list[0].id, "id-502");
  assert.equal(list.at(-1)!.id, "id-3");
});

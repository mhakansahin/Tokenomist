// Per-workspace persistence of tracking records (FR-014) on top of VS Code's workspaceState.

import { PendingWriting, SpecTracking } from "../domain/types";

/** The subset of vscode.Memento used here, so the store can be unit-tested. */
export interface MementoLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

const TRACKING_KEY = "tokenomist.tracking";
const PENDING_KEY = "tokenomist.pendingWriting";
const TOKEN_KEY = "tokenomist.hookToken";

export class TrackingStore {
  constructor(private readonly memento: MementoLike) {}

  all(): SpecTracking[] {
    return Object.values(this.records());
  }

  get(featureDir: string): SpecTracking | undefined {
    return this.records()[featureDir];
  }

  async save(tracking: SpecTracking): Promise<void> {
    await this.memento.update(TRACKING_KEY, { ...this.records(), [tracking.spec.featureDir]: tracking });
  }

  async delete(featureDir: string): Promise<void> {
    const records = this.records();
    delete records[featureDir];
    await this.memento.update(TRACKING_KEY, records);
  }

  getPendingWriting(): PendingWriting | undefined {
    return this.memento.get<PendingWriting>(PENDING_KEY);
  }

  async setPendingWriting(pending: PendingWriting | undefined): Promise<void> {
    await this.memento.update(PENDING_KEY, pending);
  }

  getHookToken(): string | undefined {
    return this.memento.get<string>(TOKEN_KEY);
  }

  async setHookToken(token: string): Promise<void> {
    await this.memento.update(TOKEN_KEY, token);
  }

  private records(): Record<string, SpecTracking> {
    return { ...(this.memento.get<Record<string, SpecTracking>>(TRACKING_KEY) ?? {}) };
  }
}

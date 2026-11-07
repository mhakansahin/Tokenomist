// What Tokenomist must undo per workspace if it is uninstalled mid-spec (constitution Kısıt 4,
// research.md R7). Lives in the extension's global storage as plain JSON so that the
// `vscode:uninstall` script can read it without VS Code.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { KeySnapshot } from "../domain/types";

export interface LedgerEntry {
  /** The local `model` key to put back; absent when Tokenomist does not own the key right now. */
  restore?: KeySnapshot;
  /** Tokenomist created settings.local.json, so an empty file may be deleted. */
  createdFile?: boolean;
  /** 005: command definitions Tokenomist changed, by workspace-relative path. */
  skills?: Record<string, SkillBackup>;
}

export interface SkillBackup {
  /** The definition exactly as it was before Tokenomist's first change. */
  original: string;
  /** The file is tracked by git and was hidden with `git update-index --skip-worktree`. */
  skipWorktree: boolean;
}

export type Ledger = Record<string, LedgerEntry>;

export const LEDGER_FILE = "restore-ledger.json";

export class RestoreLedger {
  constructor(private readonly file: string) {}

  async read(): Promise<Ledger> {
    return readLedger(this.file);
  }

  async record(workspaceRoot: string, entry: LedgerEntry): Promise<void> {
    const ledger = await this.read();
    if (JSON.stringify(ledger[workspaceRoot]) === JSON.stringify(entry)) {
      return;
    }
    ledger[workspaceRoot] = entry;
    await this.write(ledger);
  }

  /** Read-modify-write of one workspace's entry. */
  async patch(workspaceRoot: string, change: (entry: LedgerEntry) => LedgerEntry): Promise<void> {
    const ledger = await this.read();
    const before = ledger[workspaceRoot];
    const next = change(before ?? {});
    if (JSON.stringify(before) === JSON.stringify(next)) {
      return;
    }
    ledger[workspaceRoot] = next;
    await this.write(ledger);
  }

  async remove(workspaceRoot: string): Promise<void> {
    const ledger = await this.read();
    if (workspaceRoot in ledger) {
      delete ledger[workspaceRoot];
      await this.write(ledger);
    }
  }

  private async write(ledger: Ledger): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(ledger, null, 2) + "\n", "utf8");
  }
}

export async function readLedger(file: string): Promise<Ledger> {
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Ledger) : {};
  } catch {
    return {};
  }
}

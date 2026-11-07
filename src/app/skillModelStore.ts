// Writes Tokenomist's model into Spec Kit command definitions and puts them back byte for byte
// (005 FR-003–FR-005, research R4, R5). Tracked files are hidden from git with skip-worktree while
// they differ. Originals live in the restore ledger so a restart or the uninstall script can undo.

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { withModel } from "../domain/skillFrontmatter";
import { ModelValue } from "../domain/types";
import { RestoreLedger, SkillBackup } from "./restoreLedger";

export const WRITING_COMMANDS = ["speckit-specify", "speckit-clarify"] as const;
export const PHASE_COMMANDS = [
  "speckit-plan",
  "speckit-tasks",
  "speckit-implement",
  "speckit-analyze",
  "speckit-checklist",
  "speckit-converge",
] as const;

export class SkillModelStore {
  constructor(
    private readonly root: string,
    private readonly ledger: RestoreLedger,
  ) {}

  /** Workspace-relative path (forward slashes) of a command's definition, if the project has one. */
  async locate(command: string): Promise<string | undefined> {
    const name = command.replace(/^speckit-/, "");
    for (const rel of [`.claude/skills/${command}/SKILL.md`, `.claude/commands/speckit.${name}.md`]) {
      if (await exists(path.join(this.root, rel))) {
        return rel;
      }
    }
    return undefined;
  }

  /** Resolves to false when the project has no definition for the command (005 FR-007). */
  async apply(command: string, value: ModelValue): Promise<boolean> {
    const rel = await this.locate(command);
    if (!rel) {
      return false;
    }
    const file = path.join(this.root, rel);
    const current = await fs.readFile(file, "utf8");
    const backups = await this.backups();
    if (!backups[rel]) {
      const skipWorktree = await this.isTracked(rel);
      await this.saveBackup(rel, { original: current, skipWorktree });
      if (skipWorktree) {
        await this.git("update-index", "--skip-worktree", "--", rel);
      }
    }
    const next = withModel(backups[rel]?.original ?? current, value);
    if (next !== current) {
      await fs.writeFile(file, next, "utf8");
    }
    return true;
  }

  async restore(command: string): Promise<void> {
    const rel = await this.locate(command);
    if (rel) {
      await this.restorePath(rel);
    }
  }

  async restoreAll(): Promise<void> {
    for (const rel of Object.keys(await this.backups())) {
      await this.restorePath(rel);
    }
  }

  /** Commands whose definition currently carries Tokenomist's model. */
  async appliedPaths(): Promise<string[]> {
    return Object.keys(await this.backups());
  }

  private async restorePath(rel: string): Promise<void> {
    const backup = (await this.backups())[rel];
    if (!backup) {
      return;
    }
    await fs.writeFile(path.join(this.root, rel), backup.original, "utf8").catch(() => undefined);
    if (backup.skipWorktree) {
      await this.git("update-index", "--no-skip-worktree", "--", rel);
    }
    await this.ledger.patch(this.root, (entry) => {
      const skills = { ...(entry.skills ?? {}) };
      delete skills[rel];
      const { skills: _old, ...rest } = entry;
      return Object.keys(skills).length > 0 ? { ...rest, skills } : rest;
    });
  }

  private async backups(): Promise<Record<string, SkillBackup>> {
    return (await this.ledger.read())[this.root]?.skills ?? {};
  }

  private async saveBackup(rel: string, backup: SkillBackup): Promise<void> {
    await this.ledger.patch(this.root, (entry) => ({ ...entry, skills: { ...(entry.skills ?? {}), [rel]: backup } }));
  }

  private async isTracked(rel: string): Promise<boolean> {
    return (await this.git("ls-files", "--error-unmatch", "--", rel)) !== undefined;
  }

  /** Runs git in the workspace; resolves to undefined when git is missing or the command fails. */
  private git(...args: string[]): Promise<string | undefined> {
    return new Promise((resolve) => {
      execFile("git", ["-C", this.root, ...args], { windowsHide: true }, (err, stdout) => resolve(err ? undefined : stdout));
    });
  }
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(
    (s) => s.isFile(),
    () => false,
  );
}

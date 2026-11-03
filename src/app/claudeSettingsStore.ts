// File access for Claude Code settings (research.md R5, R6). Transformations live in
// domain/claudeSettingsDoc.ts; this module only reads and writes atomically.

import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseSettings, restoreModel, serializeSettings, SettingsDoc, takeKeySnapshot } from "../domain/claudeSettingsDoc";
import { KeySnapshot } from "../domain/types";

const LOCAL_RELATIVE = path.join(".claude", "settings.local.json");
const EXCLUDE_ENTRY = ".claude/settings.local.json";

export class ClaudeSettingsStore {
  constructor(
    readonly workspaceRoot: string,
    private readonly userSettingsPath = path.join(os.homedir(), ".claude", "settings.json"),
  ) {}

  get localPath(): string {
    return path.join(this.workspaceRoot, LOCAL_RELATIVE);
  }

  /** Throws SettingsParseError when the file exists but is not a JSON object. */
  async readLocal(): Promise<{ doc: SettingsDoc; exists: boolean }> {
    const text = await readIfExists(this.localPath);
    return { doc: parseSettings(text), exists: text !== undefined };
  }

  /** Writes the local file; returns true when the file did not exist before. */
  async writeLocal(doc: SettingsDoc): Promise<boolean> {
    const existed = (await readIfExists(this.localPath)) !== undefined;
    await fs.mkdir(path.dirname(this.localPath), { recursive: true });
    await writeAtomic(this.localPath, serializeSettings(doc));
    if (!existed) {
      await this.ensureGitExclude();
    }
    return !existed;
  }

  async deleteLocal(): Promise<void> {
    await fs.rm(this.localPath, { force: true });
  }

  async readUserModel(): Promise<KeySnapshot> {
    return takeKeySnapshot(parseSettings(await readIfExists(this.userSettingsPath)));
  }

  /** Puts back only the `model` key of the user settings file (R5). */
  async restoreUserModel(snapshot: KeySnapshot): Promise<void> {
    const text = await readIfExists(this.userSettingsPath);
    const doc = parseSettings(text);
    if (JSON.stringify(takeKeySnapshot(doc)) === JSON.stringify(snapshot)) {
      return;
    }
    await writeAtomic(this.userSettingsPath, serializeSettings(restoreModel(doc, snapshot)));
  }

  private async ensureGitExclude(): Promise<void> {
    const gitDir = path.join(this.workspaceRoot, ".git");
    const stat = await fs.stat(gitDir).catch(() => undefined);
    if (!stat?.isDirectory()) {
      return;
    }
    const excludePath = path.join(gitDir, "info", "exclude");
    const current = (await readIfExists(excludePath)) ?? "";
    if (current.split(/\r?\n/).some((line) => line.trim() === EXCLUDE_ENTRY)) {
      return;
    }
    await fs.mkdir(path.dirname(excludePath), { recursive: true });
    const separator = current === "" || current.endsWith("\n") ? "" : "\n";
    await fs.appendFile(excludePath, `${separator}${EXCLUDE_ENTRY}\n`, "utf8");
  }
}

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw err;
  }
}

async function writeAtomic(file: string, content: string): Promise<void> {
  const tmp = `${file}.tokenomist-${process.pid}-${Date.now()}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

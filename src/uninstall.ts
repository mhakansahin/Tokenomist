// `vscode:uninstall` hook (research.md R7): runs with plain Node after the extension is removed.
// Puts back the local `model` key and removes Tokenomist's hooks in every workspace from the ledger.

import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { LEDGER_FILE, readLedger } from "./app/restoreLedger";
import { isEmptySettings, parseSettings, removeTokenomistHooks, restoreModel, serializeSettings } from "./domain/claudeSettingsDoc";

/** `<publisher>.<name>` from package.json; VS Code names the global storage folder after it. */
export const EXTENSION_STORAGE_ID = "mhakansahin61.tokenomist";
const PRODUCTS = ["Code", "Code - Insiders", "VSCodium"];

export function ledgerCandidates(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string[] {
  const base =
    platform === "win32"
      ? (env.APPDATA ?? path.join(home, "AppData", "Roaming"))
      : platform === "darwin"
        ? path.join(home, "Library", "Application Support")
        : (env.XDG_CONFIG_HOME ?? path.join(home, ".config"));
  return PRODUCTS.map((product) => path.join(base, product, "User", "globalStorage", EXTENSION_STORAGE_ID, LEDGER_FILE));
}

export async function cleanWorkspaces(ledgerFile: string): Promise<void> {
  const ledger = await readLedger(ledgerFile);
  for (const [root, entry] of Object.entries(ledger)) {
    // 005: Spec Kit command definitions back byte for byte, and visible to git again.
    for (const [rel, backup] of Object.entries(entry.skills ?? {})) {
      await fs.writeFile(path.join(root, rel), backup.original, "utf8").catch(() => undefined);
      if (backup.skipWorktree) {
        try {
          execFileSync("git", ["-C", root, "update-index", "--no-skip-worktree", "--", rel], { windowsHide: true });
        } catch {
          // git missing or the file is gone; nothing else to undo.
        }
      }
    }
    const file = path.join(root, ".claude", "settings.local.json");
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue; // Workspace or file is gone.
    }
    try {
      const doc = parseSettings(text);
      let next = removeTokenomistHooks(doc);
      if (entry.restore) {
        next = restoreModel(next, entry.restore);
      }
      if (entry.createdFile && isEmptySettings(next)) {
        await fs.rm(file, { force: true });
      } else if (JSON.stringify(next) !== JSON.stringify(doc)) {
        await fs.writeFile(file, serializeSettings(next), "utf8");
      }
    } catch {
      // Leave files we cannot parse exactly as they are.
    }
  }
  await fs.rm(ledgerFile, { force: true });
}

async function main(): Promise<void> {
  for (const candidate of ledgerCandidates(process.platform, process.env, os.homedir())) {
    if (await fs.stat(candidate).then(() => true, () => false)) {
      await cleanWorkspaces(candidate);
    }
  }
}

if (require.main === module) {
  void main();
}

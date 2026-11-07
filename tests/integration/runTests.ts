// Launches VS Code with the extension once per scenario and runs tests/integration/suite
// (needs a display on Linux).
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

interface Run {
  scenario: string;
  workspace: string;
  env: Record<string, string>;
}

async function main(): Promise<void> {
  // Set when this runs from inside VS Code (e.g. its terminal); it would start VS Code as plain Node.
  delete process.env.ELECTRON_RUN_AS_NODE;
  delete process.env.ANTHROPIC_MODEL;
  const root = path.resolve(__dirname, "../../..");
  const fixtures = path.join(root, "tests", "fixtures");
  const runs: Run[] = [
    { scenario: "main", workspace: "workspace", env: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" } },
    { scenario: "claudeMissing", workspace: "workspace", env: {} },
    { scenario: "modelOverridden", workspace: "workspace", env: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1", ANTHROPIC_MODEL: "opus" } },
    { scenario: "noSpecKit", workspace: "plain-workspace", env: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" } },
    // 003: fresh temp workspaces, because these scenarios write into them.
    { scenario: "freshSpecKit", workspace: freshSpecKitWorkspace(), env: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" } },
    { scenario: "lateSpecKit", workspace: tempWorkspace(), env: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" } },
  ];
  for (const run of runs) {
    console.log(`# scenario: ${run.scenario}`);
    await runTests({
      extensionDevelopmentPath: root,
      extensionTestsPath: path.resolve(__dirname, "suite", "index"),
      // A fresh profile per run so workspaceState from an earlier run cannot leak into this one.
      launchArgs: [
        path.isAbsolute(run.workspace) ? run.workspace : path.join(fixtures, run.workspace),
        "--disable-extensions",
        `--user-data-dir=${mkdtempSync(path.join(os.tmpdir(), "tokenomist-vscode-"))}`,
      ],
      extensionTestsEnv: { TOKENOMIST_SCENARIO: run.scenario, ...run.env },
    });
  }
}

function tempWorkspace(): string {
  return mkdtempSync(path.join(os.tmpdir(), "tokenomist-ws-"));
}

/** Spec Kit installed, no feature yet: what `specify init` leaves behind. */
function freshSpecKitWorkspace(): string {
  const dir = tempWorkspace();
  mkdirSync(path.join(dir, ".specify", "memory"), { recursive: true });
  writeFileSync(path.join(dir, ".specify", "memory", "constitution.md"), "# Constitution\n");
  return dir;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

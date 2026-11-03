// Launches VS Code with the extension and runs tests/integration/suite (needs a display on Linux).
import { mkdtempSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  // Set when this runs from inside VS Code (e.g. its terminal); it would start VS Code as plain Node.
  delete process.env.ELECTRON_RUN_AS_NODE;
  const root = path.resolve(__dirname, "../../..");
  await runTests({
    extensionDevelopmentPath: root,
    extensionTestsPath: path.resolve(__dirname, "suite", "index"),
    // A fresh profile per run so workspaceState from an earlier run cannot leak into this one.
    launchArgs: [
      path.join(root, "tests", "fixtures", "workspace"),
      "--disable-extensions",
      `--user-data-dir=${mkdtempSync(path.join(os.tmpdir(), "tokenomist-vscode-"))}`,
    ],
    extensionTestsEnv: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

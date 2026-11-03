// Launches VS Code with the extension and runs tests/integration/suite (needs a display on Linux).
import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  // Set when this runs from inside VS Code (e.g. its terminal); it would start VS Code as plain Node.
  delete process.env.ELECTRON_RUN_AS_NODE;
  const root = path.resolve(__dirname, "../../..");
  await runTests({
    extensionDevelopmentPath: root,
    extensionTestsPath: path.resolve(__dirname, "suite", "index"),
    launchArgs: [path.join(root, "tests", "fixtures", "workspace"), "--disable-extensions"],
    extensionTestsEnv: { TOKENOMIST_ASSUME_CLAUDE_CODE: "1" },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

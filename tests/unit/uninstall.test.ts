import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readFileSync } from "node:fs";
import { cleanWorkspaces, EXTENSION_STORAGE_ID, ledgerCandidates } from "../../src/uninstall";
import { upsertTokenomistHooks } from "../../src/domain/claudeSettingsDoc";

test("the storage id matches package.json, or uninstall would not find the ledger", () => {
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"));
  assert.equal(EXTENSION_STORAGE_ID, `${pkg.publisher}.${pkg.name}`.toLowerCase());
});

test("ledger candidates cover VS Code and Insiders user data per platform", () => {
  const win = ledgerCandidates("win32", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }, "C:\\Users\\u");
  assert.ok(win.some((p) => p.includes(path.join("Code", "User", "globalStorage", "mhakansahin61.tokenomist"))));
  assert.ok(win.some((p) => p.includes("Code - Insiders")));
  const mac = ledgerCandidates("darwin", {}, "/Users/u");
  assert.ok(mac[0].startsWith(path.join("/Users/u", "Library", "Application Support")));
  const linux = ledgerCandidates("linux", {}, "/home/u");
  assert.ok(linux[0].startsWith(path.join("/home/u", ".config")));
});

test("uninstall restores the model and removes Tokenomist hooks in every ledger workspace", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-uninstall-"));
  const locked = path.join(dir, "locked");
  const idle = path.join(dir, "idle");
  const gone = path.join(dir, "deleted-later");
  for (const root of [locked, idle]) {
    await fs.mkdir(path.join(root, ".claude"), { recursive: true });
  }
  const userHook = { hooks: [{ type: "command", command: "echo mine" }] };
  await fs.writeFile(
    path.join(locked, ".claude", "settings.local.json"),
    JSON.stringify(upsertTokenomistHooks({ model: "opus", hooks: { Stop: [userHook] } }, 1234, "t")),
  );
  await fs.writeFile(path.join(idle, ".claude", "settings.local.json"), JSON.stringify(upsertTokenomistHooks({}, 1234, "t")));
  const ledgerFile = path.join(dir, "restore-ledger.json");
  await fs.writeFile(
    ledgerFile,
    JSON.stringify({ [locked]: { restore: { present: true, value: "sonnet" } }, [idle]: {}, [gone]: {} }),
  );

  await cleanWorkspaces(ledgerFile);

  assert.deepEqual(JSON.parse(await fs.readFile(path.join(locked, ".claude", "settings.local.json"), "utf8")), {
    model: "sonnet",
    hooks: { Stop: [userHook] },
  });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(idle, ".claude", "settings.local.json"), "utf8")), {});
  await assert.rejects(fs.stat(ledgerFile), "the ledger is removed afterwards");
});

test("005: uninstall puts changed Spec Kit definitions back byte for byte", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-uninstall-skills-"));
  const rel = ".claude/skills/speckit-plan/SKILL.md";
  const original = "---\nname: speckit-plan\nmodel: sonnet\n---\nBody\n";
  await fs.mkdir(path.join(dir, ".claude", "skills", "speckit-plan"), { recursive: true });
  await fs.writeFile(path.join(dir, rel), '---\nname: speckit-plan\nmodel: "haiku" # tokenomist\n---\nBody\n');
  const ledgerFile = path.join(dir, "restore-ledger.json");
  await fs.writeFile(ledgerFile, JSON.stringify({ [dir]: { skills: { [rel]: { original, skipWorktree: false } } } }));
  await cleanWorkspaces(ledgerFile);
  assert.equal(await fs.readFile(path.join(dir, rel), "utf8"), original);
});

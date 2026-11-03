import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ClaudeSettingsStore } from "../../src/app/claudeSettingsStore";
import { SettingsParseError } from "../../src/domain/claudeSettingsDoc";

async function tempWorkspace(withGit: boolean): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-store-"));
  if (withGit) {
    await fs.mkdir(path.join(root, ".git", "info"), { recursive: true });
  }
  return root;
}

test("creating the local file adds it to .git/info/exclude once", async () => {
  const root = await tempWorkspace(true);
  const store = new ClaudeSettingsStore(root, path.join(root, "user.json"));
  assert.deepEqual(await store.readLocal(), { doc: {}, exists: false });
  assert.equal(await store.writeLocal({ model: "haiku" }), true);
  assert.equal(await store.writeLocal({ model: "opus" }), false);
  const exclude = await fs.readFile(path.join(root, ".git", "info", "exclude"), "utf8");
  assert.equal(exclude, ".claude/settings.local.json\n");
  assert.deepEqual((await store.readLocal()).doc, { model: "opus" });
  const leftovers = (await fs.readdir(path.join(root, ".claude"))).filter((f) => f.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
});

test("without a git directory nothing is excluded", async () => {
  const root = await tempWorkspace(false);
  await new ClaudeSettingsStore(root, path.join(root, "user.json")).writeLocal({});
  await assert.rejects(fs.stat(path.join(root, ".git")));
});

test("a broken local file surfaces SettingsParseError", async () => {
  const root = await tempWorkspace(false);
  await fs.mkdir(path.join(root, ".claude"));
  await fs.writeFile(path.join(root, ".claude", "settings.local.json"), "{ broken");
  await assert.rejects(new ClaudeSettingsStore(root).readLocal(), SettingsParseError);
});

test("user model is restored without touching other user keys", async () => {
  const root = await tempWorkspace(false);
  const userFile = path.join(root, "user.json");
  await fs.writeFile(userFile, JSON.stringify({ theme: "dark", model: "sonnet" }));
  const store = new ClaudeSettingsStore(root, userFile);
  const snap = await store.readUserModel();
  await fs.writeFile(userFile, JSON.stringify({ theme: "dark", model: "haiku" }));
  await store.restoreUserModel(snap);
  assert.deepEqual(JSON.parse(await fs.readFile(userFile, "utf8")), { theme: "dark", model: "sonnet" });
});

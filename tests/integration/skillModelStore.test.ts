// 005 FR-004, FR-005, SC-003 with a real temporary git repository.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SkillModelStore } from "../../src/app/skillModelStore";
import { RestoreLedger } from "../../src/app/restoreLedger";

const PLAN = '---\nname: "speckit-plan"\ndescription: "Plan"\n---\n\nPlan body\n';
const TASKS_CMD = "---\ndescription: Tasks\nmodel: sonnet\n---\nTasks body\n";

async function workspace(options: { git: boolean }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-skills-"));
  await fs.mkdir(path.join(root, ".claude", "skills", "speckit-plan"), { recursive: true });
  await fs.writeFile(path.join(root, ".claude", "skills", "speckit-plan", "SKILL.md"), PLAN);
  await fs.mkdir(path.join(root, ".claude", "commands"), { recursive: true });
  await fs.writeFile(path.join(root, ".claude", "commands", "speckit.tasks.md"), TASKS_CMD);
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (options.git) {
    git("init", "-q");
    git("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
    git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "init");
  }
  // Outside the repository, like VS Code's global storage.
  const ledger = new RestoreLedger(path.join(await fs.mkdtemp(path.join(os.tmpdir(), "tokenomist-ledger-")), "restore-ledger.json"));
  return { root, git, ledger, store: new SkillModelStore(root, ledger) };
}

const read = (root: string, rel: string) => fs.readFile(path.join(root, rel), "utf8");

test("finds both the skill and the legacy command layout (R5)", async () => {
  const { store } = await workspace({ git: false });
  assert.equal(await store.locate("speckit-plan"), ".claude/skills/speckit-plan/SKILL.md");
  assert.ok((await store.locate("speckit-tasks"))?.endsWith("speckit.tasks.md"));
  assert.equal(await store.locate("speckit-implement"), undefined);
});

test("a tracked definition changes on disk but git status stays clean, and restores byte for byte (FR-004, SC-003)", async () => {
  const { root, git, store } = await workspace({ git: true });
  assert.equal(await store.apply("speckit-plan", "haiku"), true);
  assert.ok((await read(root, ".claude/skills/speckit-plan/SKILL.md")).includes('model: "haiku" # tokenomist'));
  assert.equal(git("status", "--porcelain"), "");

  await store.apply("speckit-plan", "opus[1m]");
  await store.restore("speckit-plan");
  assert.equal(await read(root, ".claude/skills/speckit-plan/SKILL.md"), PLAN, "original, not the first rewrite");
  assert.match(git("ls-files", "-v", ".claude/skills/speckit-plan/SKILL.md"), /^H /, "skip-worktree removed");
  assert.equal(git("status", "--porcelain"), "");
});

test("a user's own model line comes back (FR-005)", async () => {
  const { root, store } = await workspace({ git: true });
  await store.apply("speckit-tasks", "haiku");
  assert.ok(!(await read(root, ".claude/commands/speckit.tasks.md")).includes("model: sonnet"));
  await store.restoreAll();
  assert.equal(await read(root, ".claude/commands/speckit.tasks.md"), TASKS_CMD);
});

test("works without git; a missing definition reports false", async () => {
  const { root, store } = await workspace({ git: false });
  assert.equal(await store.apply("speckit-plan", "sonnet"), true);
  assert.equal(await store.apply("speckit-implement", "sonnet"), false);
  await store.restoreAll();
  assert.equal(await read(root, ".claude/skills/speckit-plan/SKILL.md"), PLAN);
});

test("originals are kept in the ledger, so a new store (after a restart) can still restore", async () => {
  const { root, ledger, store } = await workspace({ git: true });
  await store.apply("speckit-plan", "haiku");
  const entry = (await ledger.read())[root];
  assert.ok(entry?.skills?.[".claude/skills/speckit-plan/SKILL.md"]);
  await new SkillModelStore(root, ledger).restoreAll();
  assert.equal(await read(root, ".claude/skills/speckit-plan/SKILL.md"), PLAN);
  assert.equal((await ledger.read())[root]?.skills, undefined);
});

// 005 same-conversation mode without VS Code: real files, real hook server, fake dialogs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { post, readLocal, setup } from "./helpers";

const SKILLS = ["speckit-specify", "speckit-clarify", "speckit-plan", "speckit-tasks", "speckit-implement"];
const original = (name: string) => `---\nname: "${name}"\ndescription: "${name}"\n---\n\nBody of ${name}\n`;

async function sameEnv(t: { after(fn: () => unknown): void }, options: { automation?: "auto" | "ask"; localSettings?: unknown; skills?: string[] } = {}) {
  const env = await setup({ localSettings: options.localSettings });
  for (const name of options.skills ?? SKILLS) {
    await fs.mkdir(path.join(env.root, ".claude", "skills", name), { recursive: true });
    await fs.writeFile(path.join(env.root, ".claude", "skills", name, "SKILL.md"), original(name));
  }
  env.settings.conversation = "same";
  env.settings.automation = options.automation ?? "auto";
  const tracker = env.makeTracker();
  const server = await tracker.init();
  t.after(() => tracker.dispose());
  const skill = (name: string) => fs.readFile(path.join(env.root, ".claude", "skills", name, "SKILL.md"), "utf8");
  const expand = (command: string, session = "one") =>
    post(server.port, "/tokenomist/expansion", { command_name: command, prompt: `/${command}`, cwd: env.root, session_id: session, transcript_path: env.root }, server.token);
  return { ...env, tracker, server, skill, expand };
}

const modelLine = (text: string) => /^model: "([^"]+)" # tokenomist$/m.exec(text)?.[1];

test("writing definitions carry the writing model from the start; phase definitions only once there is a recommendation", async (t) => {
  const env = await sameEnv(t);
  assert.equal(modelLine(await env.skill("speckit-specify")), "sonnet");
  assert.equal(modelLine(await env.skill("speckit-clarify")), "sonnet");
  assert.equal(modelLine(await env.skill("speckit-plan")), undefined);

  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  assert.equal(modelLine(await env.skill("speckit-plan")), "opus", "automatic mode: ready with the recommendation (research R3)");
  assert.equal(modelLine(await env.skill("speckit-tasks")), "opus");
});

test("the whole flow runs in one conversation: nothing is stopped, no new conversation, no settings change (SC-001, FR-003)", async (t) => {
  const env = await sameEnv(t, { localSettings: { model: "claude-opus-5-5[1m]" } });
  await env.workspace.setActive(undefined);
  assert.deepEqual(await env.expand("speckit-specify"), {});

  await env.workspace.setActive("specs/001-chat");
  await env.workspace.writeSpec(await fs.readFile(path.resolve(__dirname, "../../../tests/fixtures/specs/simple/footer-year.md"), "utf8"));
  await env.tracker.onFeatureChanged(env.workspace.activeFeature);
  assert.equal(modelLine(await env.skill("speckit-plan")), "haiku");

  assert.deepEqual(await env.expand("speckit-plan"), {});
  assert.equal(env.tracker.activeTracking()!.lock?.model, "haiku", "locked without asking");
  assert.deepEqual(await env.expand("speckit-tasks"), {});
  assert.deepEqual(await env.expand("speckit-implement"), {});
  assert.deepEqual(env.newConversations, []);
  assert.equal((await readLocal(env.root))!.model, "claude-opus-5-5[1m]", "the conversation model is never touched");
  assert.deepEqual(env.ui.calls.filter((c) => /^ask/.test(c)), []);
});

test("finishing puts every definition back byte for byte (SC-003)", async (t) => {
  const env = await sameEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("haiku");
  assert.equal(modelLine(await env.skill("speckit-implement")), "haiku");
  await env.tracker.finish();
  assert.equal(await env.skill("speckit-implement"), original("speckit-implement"));
  assert.equal(modelLine(await env.skill("speckit-specify")), "sonnet", "the writing model stays ready for the next spec");
});

test("a /model update of the lock rewrites the definitions (FR-008)", async (t) => {
  const env = await sameEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("opus");
  env.ui.overrideAnswer = "update";
  await post(env.server.port, "/tokenomist/pre-model-switch", { session_id: "s", to_model: "claude-sonnet-5-5", requested_model: "sonnet", source: "command" }, env.server.token);
  assert.equal(modelLine(await env.skill("speckit-tasks")), "sonnet");
});

test("a command without a definition falls back to the new-conversation behaviour (FR-007)", async (t) => {
  const env = await sameEnv(t, { skills: ["speckit-specify", "speckit-clarify"] });
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  const answer = await env.expand("speckit-plan");
  assert.equal(answer.decision, "block");
  assert.deepEqual(env.newConversations, ["/speckit-plan"]);
});

test("switching back to the new-conversation method restores the definitions", async (t) => {
  const env = await sameEnv(t);
  env.settings.conversation = "new";
  await env.tracker.onSettingsChanged();
  assert.equal(await env.skill("speckit-specify"), original("speckit-specify"));
});

test("cleanup restores the definitions (FR-005)", async (t) => {
  const env = await sameEnv(t);
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  await env.tracker.review("haiku");
  await env.tracker.cleanClaudeSettings();
  for (const name of SKILLS) {
    assert.equal(await env.skill(name), original(name), name);
  }
});

// US3
test("ask mode: approving at /speckit-plan locks and asks to run the command again here, without a new conversation (FR-006)", async (t) => {
  const env = await sameEnv(t, { automation: "ask" });
  await env.tracker.onSpecSaved(env.workspace.activeFeature!);
  assert.equal(modelLine(await env.skill("speckit-plan")), undefined, "ask mode prepares nothing before the lock");
  const answer = await env.expand("speckit-plan");
  assert.equal(answer.decision, "block");
  assert.match(String(answer.reason), /again in this conversation/);
  assert.deepEqual(env.newConversations, []);
  assert.equal(modelLine(await env.skill("speckit-plan")), "opus");
  assert.deepEqual(await env.expand("speckit-plan"), {});
});

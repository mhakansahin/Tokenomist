import { test } from "node:test";
import assert from "node:assert/strict";
import { countTasks, isComplete } from "../../src/domain/tasksProgress";

test("counts open and done tasks in both checkbox spellings", () => {
  const md = "- [x] T001 a\n- [X] T002 b\n- [ ] T003 c\n  - [x] nested\ntext - [ ] not a task";
  assert.deepEqual(countTasks(md), { done: 3, total: 4 });
  assert.equal(isComplete(md), false);
});

test("ignores checkboxes inside fenced code blocks", () => {
  const md = "- [x] T001\n```text\n- [ ] example\n```\n~~~\n- [ ] other\n~~~\n";
  assert.deepEqual(countTasks(md), { done: 1, total: 1 });
  assert.equal(isComplete(md), true);
});

test("a file with no tasks is not complete", () => {
  assert.equal(isComplete("# Tasks\n\nnothing yet"), false);
});

test("handles CRLF line endings", () => {
  assert.equal(isComplete("- [x] T001\r\n- [x] T002\r\n"), true);
});

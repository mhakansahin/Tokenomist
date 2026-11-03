// Detects whether every task in tasks.md is checked (FR-015).

const TASK_LINE = /^\s*- \[( |x|X)\]/;
const FENCE = /^\s*(```|~~~)/;

export function countTasks(markdown: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  let fence: string | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      if (fence === undefined) {
        fence = fenceMatch[1];
      } else if (fence === fenceMatch[1]) {
        fence = undefined;
      }
      continue;
    }
    if (fence !== undefined) {
      continue;
    }
    const task = TASK_LINE.exec(line);
    if (task) {
      total++;
      if (task[1] !== " ") {
        done++;
      }
    }
  }
  return { done, total };
}

export function isComplete(markdown: string): boolean {
  const { done, total } = countTasks(markdown);
  return total > 0 && done === total;
}

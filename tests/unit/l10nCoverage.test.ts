// FR-025: every user-visible string has a Turkish translation (quickstart S12).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
// vscode.l10n.t("…") and the tracker's injected t("…"); strings may span lines.
const CALL = /(?:l10n\.t|\bt)\(\s*"((?:[^"\\]|\\.)*)"/g;
// Matches of `t(` that are not UI strings.
const NOT_UI = new Set(["hex", "environmentVariables", "/"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith(".ts") ? [full] : [];
  });
}

function json(file: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

test("every l10n string in src has a Turkish entry, and the bundle has no stale keys", () => {
  const used = new Set<string>();
  for (const file of sourceFiles(path.join(ROOT, "src"))) {
    for (const match of readFileSync(file, "utf8").matchAll(CALL)) {
      const message = JSON.parse(`"${match[1]}"`) as string;
      if (!NOT_UI.has(message)) {
        used.add(message);
      }
    }
  }
  const bundle = json("l10n/bundle.l10n.tr.json");
  const missing = [...used].filter((m) => !(m in bundle));
  const stale = Object.keys(bundle).filter((k) => !used.has(k));
  assert.deepEqual(missing, [], "missing Turkish translations");
  assert.deepEqual(stale, [], "stale bundle keys");
  for (const [key, value] of Object.entries(bundle)) {
    const placeholders = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
    assert.equal(placeholders(value), placeholders(key), `placeholders differ: ${key}`);
  }
});

test("package.json %keys% exist in both package.nls files", () => {
  const pkg = readFileSync(path.join(ROOT, "package.json"), "utf8");
  const keys = [...pkg.matchAll(/"%([^%"]+)%"/g)].map((m) => m[1]);
  assert.ok(keys.length > 0);
  const en = json("package.nls.json");
  const tr = json("package.nls.tr.json");
  for (const key of keys) {
    assert.ok(en[key], `en: ${key}`);
    assert.ok(tr[key], `tr: ${key}`);
  }
  assert.deepEqual(Object.keys(en).sort(), Object.keys(tr).sort());
});

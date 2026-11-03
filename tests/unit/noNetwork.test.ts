// FR-022 / constitution: no outbound network; the only socket is the 127.0.0.1 hook listener.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

const SRC = path.resolve(__dirname, "../../../src");
const OUTBOUND = [/\bfetch\s*\(/, /\bhttps?\.request\s*\(/, /\bhttps?\.get\s*\(/, /from\s+"node:https"/, /\bnet\.connect\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : full.endsWith(".ts") ? [full] : [];
  });
}

test("no source file makes outbound requests", () => {
  for (const file of files(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const pattern of OUTBOUND) {
      assert.ok(!pattern.test(text), `${path.relative(SRC, file)} matches ${pattern}`);
    }
  }
});

test("only hookServer.ts listens, and only on 127.0.0.1", () => {
  const listeners = files(SRC).filter((f) => /\.listen\s*\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(listeners.map((f) => path.relative(SRC, f)), [path.join("app", "hookServer.ts")]);
  assert.match(readFileSync(listeners[0], "utf8"), /\.listen\(0, "127\.0\.0\.1"/);
});

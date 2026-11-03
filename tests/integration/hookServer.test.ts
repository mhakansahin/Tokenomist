// Runs under node:test (no VS Code needed): the server only uses node:http.
import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { HookServer } from "../../src/app/hookServer";

function post(port: number, path: string, body: unknown, token?: string): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "X-Tokenomist-Token": token } : {}) },
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : undefined }));
      },
    );
    req.on("error", reject);
    req.end(data);
  });
}

function server(overrides: Partial<ConstructorParameters<typeof HookServer>[0]> = {}) {
  return new HookServer({
    token: "secret",
    decisionTimeoutMs: 200,
    expansion: async (body) => ({ seen: body.command_name }),
    preModelSwitch: async () => ({ hookSpecificOutput: { hookEventName: "PreModelSwitch", permissionDecision: "allow" } }),
    postModelSwitch: () => undefined,
    timeoutResponse: { expansion: {}, preModelSwitch: { denied: true } },
    ...overrides,
  });
}

test("listens on 127.0.0.1 only, on an ephemeral port", async () => {
  const s = server();
  const port = await s.start();
  try {
    assert.ok(port > 0);
    assert.equal(s.address?.address, "127.0.0.1");
  } finally {
    await s.stop();
  }
});

test("missing or wrong token is rejected with 401", async () => {
  const s = server();
  const port = await s.start();
  try {
    assert.equal((await post(port, "/tokenomist/expansion", {})).status, 401);
    assert.equal((await post(port, "/tokenomist/expansion", {}, "nope")).status, 401);
  } finally {
    await s.stop();
  }
});

test("routes each endpoint to its handler and answers 200 JSON", async () => {
  let switched: unknown;
  const s = server({ postModelSwitch: (body) => void (switched = body.to_model) });
  const port = await s.start();
  try {
    assert.deepEqual(await post(port, "/tokenomist/expansion", { command_name: "speckit-plan" }, "secret"), {
      status: 200,
      json: { seen: "speckit-plan" },
    });
    assert.equal((await post(port, "/tokenomist/pre-model-switch", {}, "secret")).status, 200);
    assert.deepEqual(await post(port, "/tokenomist/post-model-switch", { to_model: "claude-opus-5-5" }, "secret"), {
      status: 200,
      json: {},
    });
    assert.equal(switched, "claude-opus-5-5");
    assert.equal((await post(port, "/tokenomist/unknown", {}, "secret")).status, 404);
    assert.equal((await post(port, "/tokenomist/expansion", "{not json", "secret")).status, 400);
  } finally {
    await s.stop();
  }
});

test("a slow decision falls back to the timeout response", async () => {
  let aborted = false;
  const s = server({
    preModelSwitch: (_body, signal) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => (aborted = true));
        setTimeout(() => resolve({ late: true }), 1000);
      }),
  });
  const port = await s.start();
  try {
    assert.deepEqual((await post(port, "/tokenomist/pre-model-switch", {}, "secret")).json, { denied: true });
    assert.equal(aborted, true);
  } finally {
    await s.stop();
  }
});

test("a throwing handler answers with the timeout response instead of failing the hook", async () => {
  const s = server({ expansion: async () => Promise.reject(new Error("boom")) });
  const port = await s.start();
  try {
    assert.deepEqual(await post(port, "/tokenomist/expansion", {}, "secret"), { status: 200, json: {} });
  } finally {
    await s.stop();
  }
});

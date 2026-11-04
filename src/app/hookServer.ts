// Loopback listener for Claude Code http hooks (contracts/claude-settings-and-hooks.md §2,
// constitution 1.2.0 "Claude Code entegrasyonu"). No vscode imports: tested under node:test.

import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { TOKEN_HEADER } from "../domain/claudeSettingsDoc";

export type HookBody = Record<string, unknown> & {
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
  command_name?: string;
  from_model?: string | null;
  to_model?: string | null;
  requested_model?: string | null;
  source?: string;
};
type Json = Record<string, unknown>;

export interface HookServerOptions {
  token: string;
  /** How long a handler may wait for the user (hook timeout is 30 s). */
  decisionTimeoutMs?: number;
  expansion(body: HookBody, signal: AbortSignal): Promise<Json>;
  preModelSwitch(body: HookBody, signal: AbortSignal): Promise<Json>;
  postModelSwitch(body: HookBody): void;
  timeoutResponse: { expansion: Json; preModelSwitch: Json };
}

const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_DECISION_TIMEOUT_MS = 25_000;

export class HookServer {
  private server: Server | undefined;

  constructor(private readonly options: HookServerOptions) {}

  get address(): AddressInfo | undefined {
    const address = this.server?.address();
    return address && typeof address === "object" ? address : undefined;
  }

  start(): Promise<number> {
    const server = createServer((req, res) => void this.handle(req, res));
    this.server = server;
    return new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
    });
  }

  stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    return new Promise((resolve) => (server ? server.close(() => resolve()) : resolve()));
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== "POST" || !this.authorized(req.headers[TOKEN_HEADER.toLowerCase()])) {
      return send(res, req.method === "POST" ? 401 : 405, {});
    }
    let body: HookBody;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, {});
    }
    const { expansion, preModelSwitch, postModelSwitch, timeoutResponse } = this.options;
    switch (req.url) {
      case "/tokenomist/expansion":
        return send(res, 200, await this.decide(expansion, body, timeoutResponse.expansion));
      case "/tokenomist/pre-model-switch":
        return send(res, 200, await this.decide(preModelSwitch, body, timeoutResponse.preModelSwitch));
      case "/tokenomist/post-model-switch":
        try {
          postModelSwitch(body);
        } catch {
          // Observation only; never fail the hook.
        }
        return send(res, 200, {});
      default:
        return send(res, 404, {});
    }
  }

  private async decide(
    handler: (body: HookBody, signal: AbortSignal) => Promise<Json>,
    body: HookBody,
    fallback: Json,
  ): Promise<Json> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<Json>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(fallback);
      }, this.options.decisionTimeoutMs ?? DEFAULT_DECISION_TIMEOUT_MS);
    });
    try {
      return await Promise.race([handler(body, controller.signal), timeout]);
    } catch {
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }

  private authorized(header: string | string[] | undefined): boolean {
    if (typeof header !== "string") {
      return false;
    }
    const given = Buffer.from(header);
    const expected = Buffer.from(this.options.token);
    return given.length === expected.length && timingSafeEqual(given, expected);
  }
}

function readJson(req: IncomingMessage): Promise<HookBody> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          throw new Error("not an object");
        }
        resolve(value as HookBody);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, json: Json): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(json));
}

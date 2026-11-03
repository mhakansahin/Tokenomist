// T006 spike: logs Claude Code HTTP hook calls and answers with a fixed decision.
// Usage: node probe.js <port> <logFile>
const http = require("node:http");
const fs = require("node:fs");
const [port, logFile] = process.argv.slice(2);
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    fs.appendFileSync(logFile, JSON.stringify({ url: req.url, token: req.headers["x-tokenomist-token"], body: safe(body) }) + "\n");
    let out = {};
    if (req.url.endsWith("/expansion")) out = { decision: "block", reason: "Tokenomist probe: blocked" };
    if (req.url.endsWith("/pre-model-switch")) out = { hookSpecificOutput: { hookEventName: "PreModelSwitch", permissionDecision: "deny" }, systemMessage: "Tokenomist probe: switch denied" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
  });
}).listen(Number(port), "127.0.0.1");
function safe(b) { try { return JSON.parse(b); } catch { return b; } }

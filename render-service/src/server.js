import { createServer } from "node:http";
import { BlockedURLError, closeBrowser, render, RenderError } from "./render.js";

// Internal-only service: the Go API is its sole caller, and it's never
// published outside the Docker network (see docker-compose.yml).
const PORT = Number(process.env.PORT) || 9723;
// Each render is a Chromium tab — cap them so a burst can't take the box
// down. Requests past the queue limit get a 503 instead of waiting.
const MAX_CONCURRENT = Number(process.env.RENDER_MAX_CONCURRENT) || 2;
const MAX_QUEUED = Number(process.env.RENDER_MAX_QUEUED) || 8;
const MAX_BODY_BYTES = 16 << 10;

let active = 0;
const queue = [];

function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  if (queue.length >= MAX_QUEUED) return null;
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active--;
}

function sendJSON(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJSON(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleRender(req, res) {
  let body;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: "invalid JSON body" });
  }
  if (typeof body.url !== "string" || body.url === "") {
    return sendJSON(res, 400, { error: "url is required" });
  }
  const userAgent = typeof body.user_agent === "string" ? body.user_agent : undefined;

  const slot = acquire();
  if (!slot) return sendJSON(res, 503, { error: "render service is busy, try again shortly" });
  await slot;

  try {
    sendJSON(res, 200, await render(body.url, userAgent));
  } catch (err) {
    if (err instanceof BlockedURLError) return sendJSON(res, 400, { error: err.message });
    if (err instanceof RenderError) return sendJSON(res, 502, { error: err.message });
    console.error("render failed:", err);
    sendJSON(res, 500, { error: "render failed" });
  } finally {
    release();
  }
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    return sendJSON(res, 200, { status: "ok" });
  }
  if (req.method === "POST" && req.url === "/render") {
    return void handleRender(req, res);
  }
  sendJSON(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`render service listening on :${PORT}`));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await closeBrowser();
    process.exit(0);
  });
}

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../app");

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
    server.on("error", reject);
  });
}

function request(base, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
  });
}

test("arithmetic sanity check (always passes)", () => {
  assert.equal(2 + 2, 4);
});

test("GET /health returns 200 and status ok", async () => {
  const ctx = await startServer();
  try {
    const { statusCode, body } = await request(ctx.base, "/health");
    assert.equal(statusCode, 200, "/health must respond 200");
    const json = JSON.parse(body);
    assert.equal(json.status, "ok", "health.status must be 'ok'");
    assert.ok(typeof json.commit === "string" && json.commit.length > 0, "commit must be a non-empty string");
  } finally {
    ctx.server.close();
  }
});

test("GET /api/menu returns categories and items", async () => {
  const ctx = await startServer();
  try {
    const { statusCode, body } = await request(ctx.base, "/api/menu");
    assert.equal(statusCode, 200, "/api/menu must respond 200");
    const json = JSON.parse(body);
    assert.ok(Array.isArray(json.categories), "categories must be an array");
    assert.ok(json.categories.includes("Breakfast"), "Breakfast category must be present");
    assert.ok(Array.isArray(json.items), "items must be an array");
    assert.ok(json.items.length >= 5, "at least 5 menu items must exist");
  } finally {
    ctx.server.close();
  }
});

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../app");

const SERVER_START_TIMEOUT = 30_000;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      resolve({ server, base });
    });
    server.on("error", reject);
  });
}

function request(base, path, opts = {}) {
  const url = new URL(base + path);
  const method = opts.method || "GET";
  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: opts.headers || {},
  };
  let bodyStr = null;
  if (opts.body !== undefined) {
    if (typeof opts.body === "string") {
      options.headers["Content-Type"] =
        options.headers["Content-Type"] || "application/json";
      bodyStr = opts.body;
    } else {
      bodyStr = new URLSearchParams(opts.body).toString();
      options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    options.headers["Content-Length"] = Buffer.byteLength(bodyStr);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ res, body: data }));
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function getCookies(setCookie) {
  if (!setCookie || setCookie.length === 0) return "";
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

let ctx;
test.before(async () => {
  ctx = await startServer();
}, { timeout: SERVER_START_TIMEOUT });

test.after(() => {
  if (ctx && ctx.server) ctx.server.close();
});

test("GET /health returns status ok and commit sha", async () => {
  const { res, body } = await request(ctx.base, "/health");
  assert.equal(res.statusCode, 200, "/health should respond with 200");
  const data = JSON.parse(body);
  assert.equal(data.status, "ok", "status must be 'ok'");
  assert.ok(
    typeof data.commit === "string" && data.commit.length > 0,
    "commit must be a non-empty string"
  );
});

test("GET /api/menu lists categories and items", async () => {
  const { res, body } = await request(ctx.base, "/api/menu");
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(body);
  assert.ok(Array.isArray(data.categories), "categories must be an array");
  assert.ok(
    data.categories.includes("Breakfast"),
    "must include Breakfast category"
  );
  assert.ok(Array.isArray(data.items), "items must be an array");
  assert.ok(data.items.length >= 5, "at least 5 menu items expected");
  const item = data.items[0];
  assert.ok(item.id && item.name && typeof item.price === "number");
});

test("POST /cart/add valid item succeeds, invalid inputs rejected as 400", async () => {
  const r0 = await request(ctx.base, "/menu");
  const cookieJar = getCookies(r0.res.headers["set-cookie"]);

  const valid = await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "m1", qty: 2 }),
  });
  assert.equal(valid.res.statusCode, 200, "valid add returned non-200");
  const j = JSON.parse(valid.body);
  assert.equal(j.success, true);
  assert.ok(j.cartCount >= 2, "cart count should be at least 2");

  const badId = await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "does_not_exist", qty: 1 }),
  });
  assert.equal(badId.res.statusCode, 400, "bad item id should be 400");

  const zeroQty = await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "m1", qty: 0 }),
  });
  assert.equal(zeroQty.res.statusCode, 400, "zero qty should be 400");

  const neg = await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "m1", qty: -1 }),
  });
  assert.equal(neg.res.statusCode, 400, "negative qty should be 400");

  const unavailable = await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "s3", qty: 1 }),
  });
  assert.equal(
    unavailable.res.statusCode,
    400,
    "unavailable item should be rejected with 400"
  );
});

test("POST /checkout with empty cart is rejected", async () => {
  const r0 = await request(ctx.base, "/menu");
  const cookieJar = getCookies(r0.res.headers["set-cookie"]);

  const checkout = await request(ctx.base, "/checkout", {
    method: "POST",
    headers: { Cookie: cookieJar },
    body: {
      customerName: "Test",
      rollNumber: "T1",
      paymentMethod: "cash",
      servingMode: "together",
    },
  });
  assert.equal(
    checkout.res.statusCode,
    400,
    "empty cart checkout should be 400"
  );
  const lowerBody = checkout.body.toLowerCase();
  assert.ok(
    lowerBody.includes("empty") || lowerBody.includes("cart"),
    "body should mention empty cart"
  );
});

test("POST /checkout valid cash cart creates Pending order retrievable via /api/orders", async () => {
  const r0 = await request(ctx.base, "/menu");
  const cookieJar = getCookies(r0.res.headers["set-cookie"]);

  await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "b1", qty: 2 }),
  });

  await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "m2", qty: 1 }),
  });

  const checkout = await request(ctx.base, "/checkout", {
    method: "POST",
    headers: { Cookie: cookieJar },
    body: {
      customerName: "Aarav Sharma",
      rollNumber: "22BCA1042",
      paymentMethod: "cash",
      servingMode: "together",
    },
  });
  assert.ok(
    checkout.res.statusCode === 302 || checkout.res.statusCode === 303,
    "checkout should redirect, got: " + checkout.res.statusCode
  );
  const location = checkout.res.headers.location;
  assert.ok(
    location && location.startsWith("/confirmation/"),
    "should redirect to /confirmation/:id, got: " + location
  );
  const orderId = location.replace("/confirmation/", "");

  const detail = await request(ctx.base, `/orders/${orderId}`, {
    headers: { Cookie: cookieJar },
  });
  assert.equal(detail.res.statusCode, 200, "order detail should be 200");

  const { res: apiRes, body: apiBody } = await request(
    ctx.base,
    "/api/orders"
  );
  assert.equal(apiRes.statusCode, 200);
  const orders = JSON.parse(apiBody).orders;
  const found = orders.find((o) => o.id === orderId);
  assert.ok(found, "new order should be in /api/orders");
  assert.equal(found.status, "Pending");
  assert.equal(found.paymentMethod, "cash");
  assert.equal(found.paymentStatus, "pending");
  assert.equal(found.customerName, "Aarav Sharma");
  assert.equal(found.rollNumber, "22BCA1042");
  assert.ok(found.items.length >= 1, "order should contain items");
});

test("POST /admin/orders/:id/status advances order status and blocks reverting", async () => {
  const r0 = await request(ctx.base, "/menu");
  const cookieJar = getCookies(r0.res.headers["set-cookie"]);

  await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cookieJar, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "s1", qty: 1 }),
  });

  const checkout = await request(ctx.base, "/checkout", {
    method: "POST",
    headers: { Cookie: cookieJar },
    body: {
      customerName: "Admin Test",
      rollNumber: "ADM01",
      paymentMethod: "cash",
      servingMode: "together",
    },
  });
  const location = checkout.res.headers.location;
  const orderId = location.replace("/confirmation/", "");

  const advance = await request(
    ctx.base,
    `/admin/orders/${orderId}/status`,
    {
      method: "POST",
      body: { status: "Preparing" },
    }
  );
  assert.ok(
    advance.res.statusCode === 302 || advance.res.statusCode === 303,
    "status update should redirect, got: " + advance.res.statusCode
  );

  const { body: listBody } = await request(ctx.base, "/api/orders");
  const orders = JSON.parse(listBody).orders;
  const updated = orders.find((o) => o.id === orderId);
  assert.ok(updated, "order should still exist");
  assert.equal(updated.status, "Preparing", "status should advance to Preparing");

  const revert = await request(
    ctx.base,
    `/admin/orders/${orderId}/status`,
    {
      method: "POST",
      body: { status: "Pending" },
    }
  );
  assert.equal(
    revert.res.statusCode,
    400,
    "status revert should be blocked with 400"
  );
});

test("carts are session scoped and not shared across sessions", async () => {
  const a = await request(ctx.base, "/menu");
  const cA = getCookies(a.res.headers["set-cookie"]);
  await request(ctx.base, "/cart/add", {
    method: "POST",
    headers: { Cookie: cA, "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: "me1", qty: 3 }),
  });
  const cartPageA = await request(ctx.base, "/cart", {
    headers: { Cookie: cA },
  });
  assert.equal(cartPageA.res.statusCode, 200);
  assert.ok(
    cartPageA.body.includes("Veg Thali"),
    "session A cart should contain Veg Thali"
  );

  const b = await request(ctx.base, "/menu");
  const cB = getCookies(b.res.headers["set-cookie"]);
  const cartPageB = await request(ctx.base, "/cart", {
    headers: { Cookie: cB },
  });
  assert.equal(cartPageB.res.statusCode, 200);
  assert.ok(
    !cartPageB.body.includes("Veg Thali"),
    "session B cart should not leak from session A"
  );
});

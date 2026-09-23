const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");

const app = express();

const commitSha =
  (process.env.RENDER_GIT_COMMIT || process.env.GIT_SHA || "local").slice(0, 7);

const menu = [
  {
    id: "m1",
    name: "Masala Dosa",
    category: "Breakfast",
    price: 60,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crispy%20golden%20masala%20dosa%20with%20coconut%20chutney%20and%20sambar%20on%20a%20plate%20top%20view%20food%20photography&image_size=square",
    prepTime: "~12 min",
  },
  {
    id: "m2",
    name: "Idli Vada",
    category: "Breakfast",
    price: 45,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=soft%20steamed%20idli%20with%20crispy%20medhu%20vada%20sambar%20coconut%20chutney%20south%20indian%20breakfast%20food&image_size=square",
    prepTime: "~10 min",
  },
  {
    id: "m3",
    name: "Poha",
    category: "Breakfast",
    price: 35,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=flattened%20rice%20poha%20with%20peanuts%20onion%20coriander%20lemon%20indian%20breakfast%20top%20view&image_size=square",
    prepTime: "~8 min",
  },
  {
    id: "s1",
    name: "Veg Samosa (2pc)",
    category: "Snacks",
    price: 30,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crispy%20golden%20fried%20veg%20samosa%20with%20green%20chutney%20indian%20snack%20food%20photography&image_size=square",
    prepTime: "~5 min",
  },
  {
    id: "s2",
    name: "Vada Pav",
    category: "Snacks",
    price: 25,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=mumbai%20vada%20pav%20spicy%20potato%20fritter%20bun%20green%20chutney%20red%20chutney%20street%20food&image_size=square",
    prepTime: "~5 min",
  },
  {
    id: "s3",
    name: "Chicken Pakora",
    category: "Snacks",
    price: 70,
    available: false,
    isVeg: false,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crispy%20chicken%20pakora%20fritters%20with%20onion%20mint%20chutney%20indian%20snack%20food&image_size=square",
    prepTime: "~10 min",
  },
  {
    id: "b1",
    name: "Masala Chai",
    category: "Beverages",
    price: 20,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=steaming%20cup%20of%20masala%20chai%20tea%20with%20ginger%20cardamom%20cinnamon%20indian%20beverage&image_size=square",
    prepTime: "~3 min",
  },
  {
    id: "b2",
    name: "Cold Coffee",
    category: "Beverages",
    price: 40,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=creamy%20cold%20coffee%20with%20whipped%20cream%20chocolate%20syrup%20in%20tall%20glass%20beverage&image_size=square",
    prepTime: "~3 min",
  },
  {
    id: "b3",
    name: "Fresh Lime Soda",
    category: "Beverages",
    price: 25,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=fresh%20lime%20soda%20drink%20with%20mint%20lemon%20slices%20ice%20in%20clear%20glass%20beverage&image_size=square",
    prepTime: "~2 min",
  },
  {
    id: "me1",
    name: "Veg Thali",
    category: "Meals",
    price: 120,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=traditional%20indian%20veg%20thali%20with%20dal%20rice%20roti%20vegetables%20salad%20papad%20food&image_size=square",
    prepTime: "~15 min",
  },
  {
    id: "me2",
    name: "Chicken Biryani",
    category: "Meals",
    price: 150,
    available: true,
    isVeg: false,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=hyderabadi%20chicken%20biryani%20with%20raita%20salad%20in%20handi%20bowl%20food%20photography&image_size=square",
    prepTime: "~20 min",
  },
  {
    id: "me3",
    name: "Paneer Butter Masala",
    category: "Meals",
    price: 110,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=creamy%20paneer%20butter%20masala%20curry%20with%20naan%20bread%20indian%20food%20photography&image_size=square",
    prepTime: "~15 min",
  },
  {
    id: "d1",
    name: "Gulab Jamun (2pc)",
    category: "Desserts",
    price: 40,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=soft%20gulab%20jamun%20in%20sugar%20syrup%20with%20pistachio%20indian%20dessert%20food&image_size=square",
    prepTime: "~3 min",
  },
  {
    id: "d2",
    name: "Chocolate Brownie",
    category: "Desserts",
    price: 55,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=warm%20chocolate%20brownie%20with%20vanilla%20ice%20cream%20chocolate%20sauce%20dessert%20food&image_size=square",
    prepTime: "~5 min",
  },
  {
    id: "d3",
    name: "Kulfi Falooda",
    category: "Desserts",
    price: 60,
    available: true,
    isVeg: true,
    image:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=kulfi%20falooda%20ice%20cream%20with%20vermicelli%20rose%20syrup%20basil%20seeds%20indian%20dessert&image_size=square",
    prepTime: "~4 min",
  },
];

const orders = [];

const categories = ["All", "Breakfast", "Snacks", "Beverages", "Meals", "Desserts"];
const statuses = ["Pending", "Preparing", "Ready", "Completed"];

function generateToken() {
  const date = new Date();
  const dateStr = `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;
  const seq = (orders.length + 1).toString().padStart(3, "0");
  return `${dateStr}-${seq}`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCartItems(session) {
  if (!session.cart) session.cart = [];
  return session.cart;
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function findMenuItem(id) {
  return menu.find((m) => m.id === id);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "canteen-dev-secret-change-me",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use((req, res, next) => {
  res.locals.commitSha = commitSha;
  res.locals.currentPath = req.path;
  res.locals.escapeHtml = escapeHtml;
  next();
});

let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripeClient = require("stripe")(process.env.STRIPE_SECRET_KEY);
  } catch (_err) {
    stripeClient = null;
  }
}
const stripeEnabled = !!stripeClient;

app.get("/", (req, res) => res.redirect("/menu"));

app.get("/menu", (req, res) => {
  const cart = getCartItems(req.session);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  res.render("menu", {
    menu,
    categories,
    cartCount,
    stripeEnabled,
    user: req.session.customerName || "",
    rollNumber: req.session.rollNumber || "",
  });
});

app.get("/cart", (req, res) => {
  const cart = getCartItems(req.session);
  const subtotal = cartTotal(cart);
  const total = subtotal;
  res.render("cart", {
    cart,
    subtotal,
    total,
    servingMode: req.session.servingMode || "together",
    cartCount: cart.reduce((s, i) => s + i.qty, 0),
  });
});

app.post("/cart/add", (req, res) => {
  const { itemId, qty } = req.body;
  const quantity = parseInt(qty, 10);

  const item = findMenuItem(itemId);
  if (!item) return res.status(400).json({ error: "Item not found" });
  if (!Number.isInteger(quantity) || quantity <= 0)
    return res.status(400).json({ error: "Quantity must be a positive integer" });
  if (!item.available)
    return res.status(400).json({ error: "Item is currently unavailable" });

  const cart = getCartItems(req.session);
  const existing = cart.find((c) => c.id === itemId);
  if (existing) existing.qty += quantity;
  else
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: quantity,
      image: item.image,
      isVeg: item.isVeg,
    });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  res.json({ success: true, cartCount });
});

app.post("/cart/update", (req, res) => {
  const { itemId, qty } = req.body;
  const quantity = parseInt(qty, 10);

  if (!Number.isInteger(quantity) || quantity < 0)
    return res.status(400).json({ error: "Invalid quantity" });

  const cart = getCartItems(req.session);
  const idx = cart.findIndex((c) => c.id === itemId);
  if (idx === -1) return res.status(400).json({ error: "Item not in cart" });

  if (quantity === 0) cart.splice(idx, 1);
  else cart[idx].qty = quantity;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  res.json({ success: true, cartCount });
});

app.post("/cart/remove", (req, res) => {
  const { itemId } = req.body;
  const cart = getCartItems(req.session);
  const idx = cart.findIndex((c) => c.id === itemId);
  if (idx !== -1) cart.splice(idx, 1);
  res.redirect("/cart");
});

app.get("/checkout", (req, res) => {
  const cart = getCartItems(req.session);
  if (cart.length === 0) return res.redirect("/cart");
  const subtotal = cartTotal(cart);
  res.render("checkout", {
    cart,
    subtotal,
    total: subtotal,
    stripeEnabled,
    user: req.session.customerName || "",
    rollNumber: req.session.rollNumber || "",
    servingMode: req.session.servingMode || "together",
  });
});

app.post("/checkout", (req, res) => {
  const { customerName, rollNumber, paymentMethod, servingMode } = req.body;
  const cart = getCartItems(req.session);

  if (cart.length === 0)
    return res.status(400).send("Cart is empty. Add some items first.");
  if (!customerName || !customerName.trim())
    return res.status(400).send("Name is required.");
  if (!rollNumber || !rollNumber.trim())
    return res.status(400).send("Roll number is required.");

  req.session.customerName = customerName.trim();
  req.session.rollNumber = rollNumber.trim();
  req.session.servingMode = servingMode === "individual" ? "individual" : "together";

  if (paymentMethod === "stripe") {
    return res.redirect("/checkout/stripe-session?method=create");
  }

  const token = generateToken();
  const order = {
    id: `ord_${crypto.randomBytes(8).toString("hex")}`,
    token,
    customerName: customerName.trim(),
    rollNumber: rollNumber.trim(),
    items: JSON.parse(JSON.stringify(cart)),
    total: cartTotal(cart),
    status: "Pending",
    statusHistory: [{ status: "Pending", time: new Date().toISOString() }],
    paymentMethod: "cash",
    paymentStatus: "pending",
    servingMode: req.session.servingMode,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  if (!req.session.orderIds) req.session.orderIds = [];
  req.session.orderIds.push(order.id);
  req.session.cart = [];
  res.redirect(`/confirmation/${order.id}`);
});

function buildStripeSessionOptions(req) {
  const cart = getCartItems(req.session);
  const protocol = req.protocol;
  const host = req.get("host");
  const base = `${protocol}://${host}`;
  const line_items = cart.map((item) => ({
    price_data: {
      currency: "inr",
      product_data: { name: item.name },
      unit_amount: item.price * 100,
    },
    quantity: item.qty,
  }));
  return {
    line_items,
    mode: "payment",
    success_url: `${base}/checkout/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cart`,
    metadata: {
      customerName: req.session.customerName || "",
      rollNumber: req.session.rollNumber || "",
      servingMode: req.session.servingMode || "together",
    },
  };
}

app.get("/checkout/stripe-session", async (req, res) => {
  if (!stripeEnabled) return res.status(400).send("Stripe is not configured.");
  const cart = getCartItems(req.session);
  if (cart.length === 0) return res.redirect("/cart");

  try {
    const opts = buildStripeSessionOptions(req);
    const session = await stripeClient.checkout.sessions.create(opts);
    res.redirect(303, session.url);
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).send("Failed to start payment.");
  }
});

app.post("/checkout/stripe-session", async (req, res) => {
  if (!stripeEnabled) return res.status(400).send("Stripe is not configured.");
  const { customerName, rollNumber, servingMode } = req.body;
  if (customerName) req.session.customerName = customerName.trim();
  if (rollNumber) req.session.rollNumber = rollNumber.trim();
  req.session.servingMode = servingMode === "individual" ? "individual" : "together";

  const cart = getCartItems(req.session);
  if (cart.length === 0) return res.redirect("/cart");

  try {
    const opts = buildStripeSessionOptions(req);
    const session = await stripeClient.checkout.sessions.create(opts);
    res.redirect(303, session.url);
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).send("Failed to start payment.");
  }
});

app.get("/checkout/stripe-success", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id || !stripeEnabled) return res.redirect("/cart");

  try {
    const sess = await stripeClient.checkout.sessions.retrieve(session_id);
    if (sess.payment_status !== "paid") return res.redirect("/cart");

    const cart = getCartItems(req.session);
    if (cart.length === 0) return res.redirect("/orders/history");

    const token = generateToken();
    const order = {
      id: `ord_${crypto.randomBytes(8).toString("hex")}`,
      token,
      customerName: sess.metadata?.customerName || req.session.customerName || "Guest",
      rollNumber: sess.metadata?.rollNumber || req.session.rollNumber || "",
      items: JSON.parse(JSON.stringify(cart)),
      total: cartTotal(cart),
      status: "Pending",
      statusHistory: [{ status: "Pending", time: new Date().toISOString() }],
      paymentMethod: "stripe",
      paymentStatus: "paid",
      servingMode: sess.metadata?.servingMode || req.session.servingMode || "together",
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    if (!req.session.orderIds) req.session.orderIds = [];
    req.session.orderIds.push(order.id);
    req.session.cart = [];
    res.redirect(`/confirmation/${order.id}`);
  } catch (err) {
    console.error("Stripe verify error:", err);
    res.status(500).send("Failed to verify payment.");
  }
});

app.get("/confirmation/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).send("Order not found.");
  res.render("confirmation", { order });
});

app.get("/orders/history", (req, res) => {
  const myOrderIds = req.session.orderIds || [];
  const myOrders = orders
    .filter((o) => myOrderIds.includes(o.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render("order-history", { orders: myOrders, cartCount: 0 });
});

app.get("/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).send("Order not found.");
  const confirmed = req.query.confirmed === "1";
  res.render("order", {
    order,
    confirmed,
    statuses,
    isAdmin: false,
    cartCount: 0,
  });
});

app.get("/admin/orders", (req, res) => {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.render("admin-orders", { orders: sorted, statuses });
});

app.post("/admin/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  if (!statuses.includes(status))
    return res.status(400).json({ error: "Invalid status" });
  const currentIdx = statuses.indexOf(order.status);
  const newIdx = statuses.indexOf(status);
  if (newIdx < currentIdx)
    return res.status(400).json({ error: "Cannot revert status" });
  order.status = status;
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ status, time: new Date().toISOString() });
  res.redirect("/admin/orders");
});

app.post("/admin/orders/:id/mark-paid", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  order.paymentStatus = "paid";
  res.redirect("/admin/orders");
});

app.get("/api/menu", (_req, res) => {
  res.json({
    categories,
    items: menu.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      available: m.available,
      isVeg: m.isVeg,
      prepTime: m.prepTime,
      image: m.image,
    })),
  });
});

app.get("/api/orders", (_req, res) => {
  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      token: o.token,
      customerName: o.customerName,
      rollNumber: o.rollNumber,
      items: o.items,
      total: o.total,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      servingMode: o.servingMode,
      createdAt: o.createdAt,
    })),
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", commit: commitSha });
});

module.exports = { app, menu, orders, categories, statuses, stripeEnabled, commitSha };

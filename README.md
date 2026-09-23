# CampusBites Canteen Management System

A full-stack canteen web application built for a college canteen: browse the menu
by category, search and add items to a session-scoped cart, pay online via Stripe
(test mode) or choose cash at the counter, receive an order token, and track
order status. Canteen staff can advance orders through
`Pending → Preparing → Ready → Completed` and mark cash orders as paid.

Designed in a **Zomato-inspired visual language** — warm red accents,
pill-shaped category chips, veg/non-veg regulatory badges, and a
four-stage order-tracking stepper with timestamps.

---

## 🏗️ Tech Stack

| Layer        | Choice |
|--------------|--------|
| Runtime      | Node.js 20+ |
| Web framework| Express 4 |
| Templates    | EJS (server-rendered, no SPA framework) |
| Data store   | In-memory JS arrays/objects |
| Sessions     | `express-session` — one cart per browser session |
| Testing      | Built-in `node:test` + `node:assert/strict` |
| Linting      | ESLint 9 (`eslint:recommended`, flat config) |
| Payments     | Stripe Checkout — **test mode** via `stripe` npm package |
| Container    | Docker (`node:22-alpine`, runs as non-root `node` user) |
| CI/CD        | GitHub Actions (`test` → `build` → `deploy` → `verify`) |
| Hosting      | Render (free tier) |
| Styling      | Plain CSS in `public/styles.css` — no build step |

---

## ✨ Features

- **Menu / Landing** (`GET /menu` + `/`)
  - 15 seeded dishes across **Breakfast, Snacks, Beverages, Meals, Desserts**
  - Client-side category chips (All / category) and a live search box
  - Responsive food cards with image, veg/non-veg badge, rating chip, prep-time badge,
    hover lift, stepper + Add to Cart
  - Sold-out items get a dim overlay and disabled Add button
  - Sticky mobile bottom bar showing item count + total once cart is non-empty

- **Cart** (`GET /cart`, `POST /cart/add`, `POST /cart/update`, `POST /cart/remove`)
  - Session-scoped; sessions do not leak between browsers
  - Inline stepper, per-line live total, Remove control
  - Serving preference: **Serve all together** vs. **Serve items as ready**
  - Sticky desktop order summary + fixed mobile bottom checkout bar
  - Warm, friendly empty-cart microcopy instead of a blank page

- **Checkout + Payment** (`GET /checkout`, `POST /checkout`)
  - Requires name + roll number; validates non-empty cart
  - Two paths:
    - 💵 **Cash at counter** — creates the order immediately with `paymentStatus: pending`
    - 💳 **Stripe Checkout** — redirects to Stripe-hosted payment page (`stripe.checkout.sessions.create`);
      after success callback, server-verifies `payment_status === "paid"` with
      `stripe.checkout.sessions.retrieve` **before** marking `paymentStatus: "paid"`
  - If `STRIPE_SECRET_KEY` is unset, the online-payment card disables gracefully
    (no crash, cash-only flow works)
  - Short human-friendly **order token** generated per order (e.g. `240923-007`)

- **Digital Confirmation / Token** (`GET /confirmation/:id`)
  - Large centered token, customer details, itemised receipt, payment badge, serving note

- **Order tracking** (`GET /orders/:id`)
  - Four-stage visual stepper (`Pending → Preparing → Ready → Completed`)
  - Each completed stage stamped with the time it was reached
  - Current stage pulses with a soft red halo
  - Success banner when arriving immediately after checkout

- **Order History** (`GET /orders/history`)
  - All orders from the current session/customer, newest first
  - Client-side date-range chips: Today / This week / This month / All time
  - Collapsible item list per order; links to the per-order detail view

- **Staff / Admin** (`GET /admin/orders`, `POST /admin/orders/:id/status`,
  `POST /admin/orders/:id/mark-paid`)
  - Dashboard with summary counts (Pending / Preparing / Ready)
  - Per-order item table, advance-status `<select>` (cannot revert),
    Mark-paid button for cash orders

- **JSON / Infra**
  - `GET /api/menu` — categories + items (name, price, veg, availability, etc.)
  - `GET /api/orders` — orders with fields suitable for programmatic consumption
  - `GET /health` → `{"status":"ok","commit":"<short-sha>"}`
  - Footer on **every page** shows the running commit id (from `RENDER_GIT_COMMIT` / `GIT_SHA` / `"local"`)
  - All user-supplied text escaped via a helper before rendering (XSS prevention)

---

## 🚀 Run it locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy env example and add a Stripe TEST secret key
#    If you skip this step, only cash-mode checkout will be offered.
cp .env.example .env
# edit .env → STRIPE_SECRET_KEY=sk_test_xxx

# 3. Start the server
npm start
# → http://localhost:3000
```

### Run tests (7 automated tests via node:test)

```bash
npm test
```

What is covered:
1. `GET /health` returns `status: "ok"` and a commit sha.
2. `GET /api/menu` returns categories and items.
3. `POST /cart/add` accepts a valid item and **rejects 400** for bad id,
   zero qty, negative qty, and unavailable items.
4. `POST /checkout` with an empty cart is rejected as 400.
5. `POST /checkout` with a valid cart + cash creates a `Pending` order with
   `paymentMethod: "cash"`; the order appears on `/orders/:id` and in `/api/orders`.
6. Admin status update advances an order to Preparing and blocks reverting.
7. Two separate browser sessions have isolated carts.

### Lint

```bash
npm run lint
```

---

## 🐳 Docker

### Build
```bash
docker build -t canteen:latest \
  --build-arg GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo local) .
```

### Run
```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e STRIPE_SECRET_KEY=sk_test_xxx \
  canteen:latest
# → http://localhost:3000/health should confirm the image works
```

Image properties:
- Base `node:22-alpine` for a small footprint
- Single stage with `npm ci --omit=dev` (no devDependencies shipped)
- Build-arg `GIT_SHA` baked into the container as `ENV GIT_SHA`
- Runs as the built-in non-root `node` user, not `root`
- Exposes `3000`; starts with `CMD ["node", "server.js"]`

---

## 🔐 Environment Variables

| Name                    | Required? | Purpose                                                      | Where to set                                                          |
|-------------------------|-----------|--------------------------------------------------------------|-----------------------------------------------------------------------|
| `PORT`                  | No (3000) | HTTP port                                                    | Render; local `.env`; Docker via `-e`                                 |
| `GIT_SHA` / `RENDER_GIT_COMMIT` | No | Short SHA shown in footer                              | Docker `--build-arg`; Render automatically sets `RENDER_GIT_COMMIT`  |
| `SESSION_SECRET`        | No (dev default) | `express-session` signing secret                     | Local `.env` or Render env var                                        |
| `STRIPE_SECRET_KEY`     | No        | Server-side Stripe test key (`sk_test_…`)                    | Local `.env` (gitignored); Render env var                             |
| `STRIPE_PUBLISHABLE_KEY`| No        | Client-side key (reserved)                                   | Same as above                                                         |
| `RENDER_DEPLOY_HOOK`    | CI only   | Triggers a Render deploy after CI passes                     | GitHub repo → **Settings → Secrets and variables → Actions** secret  |
| `LIVE_URL`              | CI only   | Public URL used by the `verify` job to grep for the SHA      | GitHub Actions secret (optional)                                      |

**Never commit** keys, deploy-hook URLs, or secrets. The provided `.gitignore`
excludes `.env` and `node_modules/`.

---

## 🛠️ CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

```
PUSH / PR ──► [ test ] ──► [ build ] ──► [ deploy ] ──► [ verify ]
                   │            │   ▲            │                 │
                   ▼            ▼   │            ▼                 ▼
               lint & tests   docker   POST Render hook   grep LIVE_URL
                               smoke                         for new SHA
                              (curl /health)
```

**1. `test`** (runs on every push + PR)
Checkouts the repo, sets up Node 22, restores `npm ci` cache, then runs
`npm run lint` and `npm test`. If any test or lint rule fails, the run turns
red and every downstream job is skipped — **nothing broken can be built or
deployed**.

**2. `build`** (`needs: test`; runs on every push + PR)
Uses `docker/build-push-action` to build the image with `GIT_SHA=${{ github.sha }}`,
then starts a container on port 3000 and `curl -f`s `/health`. A non-200 here
fails the job; this is your Docker smoke / canary check.

**3. `deploy`** (`needs: build`; only on `push` to `refs/heads/main`)
Hits `${{ secrets.RENDER_DEPLOY_HOOK }}&ref=${{ github.sha }}` with a POST to
tell Render to pull the exact SHA and rebuild the live service.

**4. `verify`** (`needs: deploy`; only on `push` to `main`)
Waits 30 seconds for Render to propagate, then curls the production
`LIVE_URL` and `grep`s for the first 7 characters of `GITHUB_SHA` in the
footers — proves that what merged is what actually went live.

---

## 🧭 Folder structure

```
canteen/
├── .github/workflows/ci-cd.yml     # CI/CD pipeline
├── test/
│   └── app.test.js                 # 7 automated tests (node:test)
├── views/
│   ├── menu.ejs                    # Browse + search + categories
│   ├── cart.ejs                    # Session cart + steppers + summary
│   ├── checkout.ejs                # Details + serving + payment picker
│   ├── confirmation.ejs            # Digital token / receipt
│   ├── order.ejs                   # Per-order tracking stepper
│   ├── order-history.ejs           # Past orders with date filters
│   └── admin-orders.ejs            # Staff dashboard
├── public/
│   └── styles.css                  # Zomato-inspired design system
├── app.js                          # Express app, routes, data (exported)
├── server.js                       # http listener, reads PORT
├── Dockerfile
├── eslint.config.js                # Flat ESLint 9 config
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚦 Git Workflow Used

- `git init -b main` then 10+ small, conventional commits (`feat:`, `fix:`, `test:`, `ci:`, …).
- At least one feature built on a `feature/*` branch, pushed, PR'd, and merged via green CI.
- Intentional test-break + PR → screenshot of the failed Actions run (build/deploy never ran
  because they `need: test`) → fix + merge → screenshot of the green run and live footer.
- `.gitignore` excludes `node_modules/` and `.env`.

---

## 📎 Placeholder Links (Fill after Submission)

- **GitHub repo**: `https://github.com/<your-username>/canteen-management-system`
- **Live site (Render)**: `https://<your-service>.onrender.com`
- **Example successful Actions run**: `<Actions URL ending in runs/…>`
- **Failure-demo Actions run**: `<Actions URL of the intentionally-broken PR>`

---

## 🎨 Why This Color Scheme / UX

The palette and layout borrow from food-delivery patterns (Zomato's red-centric
system, pill-shaped category chips, India-mandated veg/non-veg square-and-dot
indicators, sticky mobile cart bar, and a filling status stepper) because:

1. Warm reds/oranges are read as appetite-triggering and stand out on a phone.
2. The veg/non-veg badge is a regulatory standard that a large fraction of users rely on.
3. A sticky bottom cart bar turns a two-page "add → go to cart" flow into a one-handed experience.
4. A stepper with timestamps turns "waiting for food" into a reassuring, visible process rather than a spinner.

This is UX convention, not a copy of proprietary brand assets — copy, images, and
microcopy are original; patterns are standard patterns in the food-delivery space.

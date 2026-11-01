# HOUSE OF B'WEARS — Men's Fashion Online Store (Nigeria)

A full e-commerce platform for a men's clothing business: customer storefront, Paystack payments,
and a secure admin dashboard. Built with **Next.js (App Router)**, **PostgreSQL + Drizzle ORM**,
and **Tailwind CSS**. Business name, logo and contact details are editable from the dashboard.

---

## Push this project to your GitHub repository

The repo has already been prepared — a `.gitignore` is in place and `.env` (which holds your
database credentials) is **excluded from version control**, so no secrets get committed.

Create an empty repository on GitHub (no README, no `.gitignore`, no licence), then run:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

If your account requires a personal access token instead of a password, GitHub prompts for it —
paste the token as the password. After the first push, later changes are just:

```bash
git add -A
git commit -m "Describe what changed"
git push
```

### What is committed vs. ignored

| Committed | Ignored (never uploaded) |
|---|---|
| All source in `src/`, `scripts/`, `supabase/`, `public/` | `.env` — your real credentials |
| `.env.example` — a template listing every variable you need | `node_modules/` (710 MB, reinstalled with `npm ci`) |
| `.github/workflows/ci.yml` — automated checks | `.next/` build output |
| `README.md`, `drizzle.config.json`, `package.json` | `uploads/` runtime images, `*.log` |

Anyone who clones the repo copies `.env.example` to `.env` and fills in their own values.

### Continuous integration

Every push to `main` and every pull request automatically runs `.github/workflows/ci.yml`, which
starts a real PostgreSQL 15 service, applies the schema, then runs `next typegen`, the TypeScript
check, the production build, the 83-check admin business-logic test suite, and lint. If any of
those fail, the check shows red on GitHub — you'll catch breakage before it reaches customers.

---

## Deploying

The app is a standard Next.js server-rendered project, so it needs a Node host
(**not** a static host), plus a PostgreSQL database.

1. Provision PostgreSQL (Supabase, Neon, Railway, or your own server) and copy the connection string.
2. On your host, set the environment variables from `.env.example`:
   `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Apply the schema once: `npx drizzle-kit push`.
4. Build and start: `npm run build && npm start`.
5. Register the Paystack webhook: `https://<your-domain>/api/paystack/webhook`.

> **Uploaded images** are written to `./uploads` on the server's disk. On platforms with an
> ephemeral filesystem (Vercel, Heroku free tier) those files are lost on redeploy — either use a
> host with a persistent disk, or paste image URLs instead of uploading in the product form.
> Migrating `src/app/api/upload/route.ts` to Supabase Storage or S3 removes that limitation.

---

## Admin dashboard (`/admin`)

Sign in at `/admin/login`. Only accounts with the `admin` role can enter; every page and every
form action re-checks the role on the server.

### Admin login details

| | Starter value |
|---|---|
| Admin login page | `https://<your-domain>/admin/login` |
| Email | `admin@store.com` (or the `ADMIN_EMAIL` you set before first launch) |
| Password | `Admin@12345` (or the `ADMIN_PASSWORD` you set before first launch) |

The login page shows these starter details only while the default password is still in use.
After you sign in, change the password under **Store Settings → Admin password**. The starter
details then disappear from the login page.

**Forgot the admin password?** On the server, run:

```bash
node scripts/reset-admin-password.mjs admin@store.com "NewStrongPassword1"
```

The password must be at least 10 characters. This signs out all active sessions for that account.

| Sidebar item | What the owner can do |
|---|---|
| **Dashboard Overview** | Total revenue (₦), total / pending / completed orders, registered customers, active products, recent orders, recent sales, 12-month sales chart, low-stock and out-of-stock alerts |
| **Products** | Search, filter (published, drafts, featured, best sellers), publish/unpublish, mark featured or best seller, quick stock edits, edit, delete |
| **Add New Product** | Four guided steps: details → pricing (live price preview, discount price) → multiple photos (drag-free ordering with arrows, or paste URLs) → sizes (S, M, L, XL, XXL, Custom) and colours |
| **Categories** | Create, rename, upload a category image, show/hide on the store, set display order, delete (products are kept) |
| **Orders** | Order ID, customer name and phone, products with size, colour and quantity, total, payment status, delivery address, date. Status: Pending → Processing → Shipped → Delivered / Cancelled |
| **Payments** | Transaction reference, customer, order ID, amount, method, date, status (Pending / Successful / Failed). “Check with Paystack” for Paystack payments; confirm or reject bank transfers |
| **Customers** | Name, phone, email, order count, total spent, full order history per customer; guest shoppers listed separately |
| **Inventory** | Units in stock, healthy / low / out-of-stock counts, stock value, restock inline, filters |
| **Sales Reports** | Daily (30 days), weekly (12 weeks) and monthly (12 months) revenue and order counts, completed orders, average order value, best-selling products, CSV export |
| **Store Settings** | Business name, tagline, description, logo, announcement bar, business email, phone, WhatsApp, address, Instagram, Facebook, X, TikTok, delivery fees, free-delivery threshold, low-stock level, payment options, bank details, admin password |
| **Logout** | Ends the session |

### Money and stock rules (enforced in code)

- **Revenue** counts only payments confirmed as successful on orders that are not cancelled.
- **Stock is reduced only when a payment is confirmed**, once per order, under database row locks.
  Placing an order does not reserve stock. Cancelling a paid order returns its stock.
- **Processing, shipped and delivered require a confirmed payment.** The dashboard blocks the change until
  the payment is verified.
- **Bank transfers are never automatic.** A customer's “I have paid” note is shown to the admin as a claim.
  Only an admin can confirm it, after checking the bank statement. Customer receipts/notes are never treated as proof.
- **Paystack payments are verified by the server**: callback verification, the signed webhook
  (HMAC-SHA512), and the admin's “Check with Paystack” button. Amounts are checked against the order total.
- Confirmations are **idempotent**: a repeated webhook or two simultaneous confirmations process a payment once.
- A payment that arrives for a **cancelled** order is recorded and the admin is alerted to refund it. Stock is not touched.

---

## Setup

1. Copy `.env.example` to `.env` and set:

   | Variable | Purpose |
   |---|---|
   | `DATABASE_URL` | PostgreSQL connection (local, or the direct Postgres URI from Supabase → Project Settings → Database) |
   | `PAYSTACK_SECRET_KEY` | Server-only Paystack secret key (enables card / transfer / USSD payments) |
   | `NEXT_PUBLIC_SITE_URL` | Public URL of the site (used for Paystack callbacks) |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, created on first launch. **Change the password** in Store Settings after signing in |

2. Create the tables: `npx drizzle-kit push`
3. Start the app: `npm run dev` (or `npm run build && npm start`)
4. Register the Paystack webhook: `https://<your-domain>/api/paystack/webhook`

The database is seeded on first request with the 13 default categories, sample products, and the
`WELCOME10` and `NAIJA5K` discount codes.

### Supabase (database, RLS)

The project runs on any PostgreSQL database, including Supabase. After `drizzle-kit push`, run
`supabase/rls.sql` in the Supabase SQL editor. It:

- enables Row Level Security on every table;
- lets the public anon key read only published products, active categories and store settings;
- gives full access to signed-in users whose email matches an `admin` user (`public.is_admin()`);
- revokes direct write access for anon and authenticated roles.

The server connects with `DATABASE_URL` (a privileged role that bypasses RLS) and enforces admin
checks in code. Do not put the service-role or database password in any `NEXT_PUBLIC_*` variable.

> **Supabase Auth status:** the admin and customer sign-in in this build uses the app's own
> hashed-password sessions (httpOnly cookie, role check on every request). Switching sign-in to
> Supabase Auth requires your project URL and keys, which are not configured in this environment.
> The RLS policies above already use the Supabase JWT email claim, so they are ready for that switch.

---

## Testing

```bash
node scripts/run-admin-tests.mjs
```

This runs against the database in `DATABASE_URL` and covers 83 checks: product create / validate / edit /
publish / delete; category create / rename / hide / delete; order placement and stock rules; manual bank
transfer confirmation; Paystack failure fallback; cancellation and stock return; concurrent confirmations;
underpayment rejection; dashboard, report and inventory figures. It removes all test data when finished.

---

## Security model

- Passwords hashed with scrypt. Sessions are random tokens stored server-side (httpOnly cookie, 30 days).
- Role-based access: the admin layout and every admin server action call `assertAdmin()`. Uploads are admin-only.
- Secrets are read only from server environment variables and are never sent to the browser.
- Row Level Security policies in `supabase/rls.sql` protect the public API surface.
- The admin login page does not display credentials.

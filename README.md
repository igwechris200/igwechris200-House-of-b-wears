# Men's Fashion Online Store — Nigeria

A full e-commerce platform for a men's clothing business: customer storefront, Paystack payments,
and a secure admin dashboard. Built with **Next.js (App Router)**, **PostgreSQL + Drizzle ORM**,
and **Tailwind CSS**. Business name, logo and contact details are editable from the dashboard.

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

The repository is ready for the **Supabase GitHub integration**:

| File | Purpose |
|---|---|
| `supabase/config.toml` | Supabase project config (needed by the integration) |
| `supabase/migrations/20261102000000_initial_schema.sql` | Creates all 12 tables |
| `supabase/migrations/20261102000100_row_level_security.sql` | Turns on Row Level Security and adds the access policies |

**Set up the integration** (Supabase dashboard → Project Settings → Integrations → GitHub):
1. Connect `igwechris200/igwechris200-House-of-b-wears`.
2. **Working directory:** `.` (the repository root, where the `supabase/` folder is).
3. **Production branch:** `main`, with **Deploy to production** turned on.

Supabase runs new migration files when they reach `main`. If the integration was connected before these
files were pushed, it may not run them for that push; you can then paste both files, in order, into the
**SQL editor** instead. Don't run `drizzle-kit push` against Supabase as well; the migrations already create the tables.

**Connect the app** by setting `DATABASE_URL` on your host to the Supabase connection string
(Project Settings → Database → Connect). Use the **Session pooler** string (IPv4, port 5432) unless your
host supports IPv6. SSL is turned on automatically for non-local databases (`src/db/index.ts`).

The Row Level Security migration:
- enables Row Level Security on every table;
- lets the public anon key read only published products, active categories and store settings;
- gives full access to signed-in users whose email matches an `admin` user (`public.is_admin()`);
- revokes direct write access for anon and authenticated roles.

The server connects with `DATABASE_URL` (a privileged role that bypasses RLS) and enforces admin
checks in code. Do not put the service-role key or database password in any `NEXT_PUBLIC_*` variable.

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
- Row Level Security policies in `supabase/migrations/20261102000100_row_level_security.sql` protect the public API surface.
- The admin login page does not display credentials.

---

## Running locally

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env        # then edit .env with your real values
npx drizzle-kit push        # creates the database tables
npm run dev                 # http://localhost:3000
```

On first start, the app seeds the default categories and sample products, and creates the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

> `drizzle.config.json` currently points at the local database URL. If you use a hosted database, update `dbCredentials.url` there (or run `drizzle-kit push` with that config pointing at your `DATABASE_URL`).

## Deploying to Vercel (with your Supabase database)

The database tables already exist in Supabase, and Supabase is the only place your store data lives.
Vercel just runs the website and connects to it.

1. **Import the repo:** Vercel → **Add New → Project** → import `igwechris200/igwechris200-House-of-b-wears`.
   Framework: Next.js (detected). Leave the build settings as they are.
2. **Add environment variables** (Project → Settings → Environment Variables, for **Production** and **Preview**):

   | Variable | Required | Value |
   |---|---|---|
   | `DATABASE_URL` | **Yes** | Supabase → **Connect** → **Transaction pooler** string (port **6543**), with your real database password |
   | `NEXT_PUBLIC_SITE_URL` | For payments | Your live address, e.g. `https://house-of-bwears.vercel.app` |
   | `PAYSTACK_SECRET_KEY` | For payments | Paystack secret key (server only) |
   | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Optional | Paystack public key |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | No | Only used if no admin exists. Your Supabase database already has one |

   If your password has special characters such as `@`, `#` or `%`, they must be URL-encoded in
   `DATABASE_URL` (`@` → `%40`, `#` → `%23`, `%` → `%25`).
3. **Deploy.** `vercel.json` runs the site in Dublin (`dub1`), next to the Supabase database in `eu-west-1`.
4. **Paystack:** set the webhook URL to `https://<your-domain>/api/paystack/webhook`.
5. **Sign in** at `/admin/login` and change the admin password in **Store Settings** straight away.

Do **not** run `npx drizzle-kit push` against Supabase: the tables and access rules are managed by
`supabase/migrations/`, and a push could undo the Row Level Security settings.

### Important: product image uploads
Admin-uploaded images are saved to the local `uploads/` folder. That works on a VPS or a host with a persistent disk. **On Vercel the disk is read-only**, so the upload box shows a message asking for an image link instead. Pasting image URLs in the product and category forms works everywhere. To upload from your phone or computer on Vercel, the next step is connecting Supabase Storage (needs your Supabase project URL and service key).

### Preview-only session fallback
`src/lib/auth.ts` has a cookie-less session fallback that is **only** enabled inside the hosted preview sandbox (`E2B_SANDBOX=true`) **and** only while it uses its own local database. It is always off on Vercel and whenever the database is Supabase, so every request on your real site must carry its own valid session cookie.

# Deploying HOUSE OF B'WEARS to Vercel

A step-by-step guide. Each step explains what to click and why.

---

## 1. Push your code to GitHub

```bash
git push origin main
```

Your repository: https://github.com/igwechris200/igwechris200-House-of-b-wears

If git asks for a password, use a personal access token with **Contents** and
**Workflows** read/write permission.

---

## 2. Get your Supabase connection string

In Supabase: **Project Settings → Database → Connection string → URI**.

**For Vercel, use the transaction pooler (port 6543), not port 5432.** Serverless
functions open many short-lived connections, and the transaction pooler is built
for that. It looks like:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Also check **Project Settings → Database → Connection pooling → Allow new
connections** is enabled, and that **Network restrictions** (if configured)
permit Vercel's outbound IPs.

---

## 3. Import the project into Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** and select `igwechris200/igwechris200-House-of-b-wears`
3. Framework Preset is detected as **Next.js** — leave it
4. Leave Build Command (`next build`), Output Directory and Install Command as defaults
5. Open **Environment Variables** and add the ones below
6. Click **Deploy**

---

## 4. Environment variables to set in Vercel

Set these for **Production**, **Preview** and **Development** unless noted.

### Required

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | your transaction-pooler URI | Port 6543, with `?pgbouncer=true` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Update later if you add a custom domain |

### Strongly recommended

| Key | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Makes product photo uploads persistent |
| `SUPABASE_SERVICE_ROLE_KEY` | from Project Settings → API | **Server-side only**, never `NEXT_PUBLIC_*` |
| `SUPABASE_STORAGE_BUCKET` | `product-images` | Created automatically on first upload |

Without the Supabase keys, image uploads are disabled on Vercel with a clear
message, and you can still add products by pasting image URLs.

### Optional

| Key | Value | Notes |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Enables online payment |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_...` | |
| `ADMIN_EMAIL` | your email | Only used on first seed |
| `ADMIN_PASSWORD` | a strong password | Change it in Store Settings after first login |

### Do NOT set

`ALLOW_COOKIELESS_ADMIN` — this is a development escape hatch. Setting it in
production would let any visitor into the admin dashboard.

---

## 5. Apply the database schema

The schema is **not** applied by deploying. After your first deployment, run
locally with your production `DATABASE_URL`:

```bash
DATABASE_URL="<your-transaction-pooler-URI>" npx drizzle-kit push
```

Then run the Row Level Security policies in the Supabase **SQL Editor** — paste
the contents of `supabase/rls.sql`.

If you already ran `scripts/connect-supabase.mjs`, both are already done.

---

## 6. After deployment

1. **Change the admin password.** Visit `https://your-app.vercel.app/admin`,
   sign in, go to **Store Settings → Admin password**. The default is
   `Admin@12345`.
2. **Register the Paystack webhook.** In Paystack → Settings → API Keys &
   Webhooks, set the URL to `https://your-app.vercel.app/api/paystack/webhook`.
3. **Test a real order** end to end with a small purchase.
4. **Add your domain.** Vercel → Project → Settings → Domains. Then update
   `NEXT_PUBLIC_SITE_URL` and the Paystack webhook URL to match.

---

## Troubleshooting

**"password authentication failed"** — re-copy the connection string; if you
reset the database password, update `DATABASE_URL` everywhere.

**Tables missing / store is empty** — the schema was not applied. Run
`npx drizzle-kit push` as in step 5.

**Image upload fails** — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not
set, so the app is on the (unsupported) local-disk fallback.

**Paystack redirects to localhost** — `NEXT_PUBLIC_SITE_URL` is missing or
still points at `http://localhost:3000`.

**Admin dashboard accessible without signing in** — `ALLOW_COOKIELESS_ADMIN` is
set to `1`. Remove it from your Vercel environment variables immediately.

**Too many connections** — you are using port 5432 instead of the transaction
pooler (6543) with `?pgbouncer=true`.

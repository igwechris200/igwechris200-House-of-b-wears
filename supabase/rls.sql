-- ============================================================================
-- Row Level Security for the Men's Fashion store (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Apply in the Supabase SQL editor (or: psql "$DATABASE_URL" -f supabase/rls.sql)
-- AFTER `npx drizzle-kit push`.
--
-- How access works
--   * The Next.js server connects with DATABASE_URL (a privileged role that
--     bypasses RLS). It performs all business logic and enforces admin checks
--     in server code (assertAdmin / requireAdmin).
--   * The public anon key that ships to browsers is restricted by these
--     policies: anonymous visitors can only read published catalogue data
--     and non-secret settings. Customer, order, payment and admin data is
--     unreachable through the REST/GraphQL API.
--   * Any Supabase Auth user whose email matches an `admin` row in `users`
--     gets full access via public.is_admin().
-- ============================================================================

-- 1. Admin check -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.role = 'admin'
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Enable RLS on every application table -----------------------------------
alter table public.users                  enable row level security;
alter table public.sessions               enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.payments               enable row level security;
alter table public.discount_codes         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.settings               enable row level security;
alter table public.notifications          enable row level security;
alter table public.wishlists              enable row level security;

-- 3. Public (anon + signed-in customers) read-only access to the storefront --
drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories
  for select to anon, authenticated using (active = true);

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products
  for select to anon, authenticated using (active = true);

drop policy if exists "public read store settings" on public.settings;
create policy "public read store settings" on public.settings
  for select to anon, authenticated using (key <> 'seeded');

-- 4. Administrators: full access to every table ------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'sessions', 'categories', 'products', 'orders', 'order_items',
    'payments', 'discount_codes', 'newsletter_subscribers', 'settings',
    'notifications', 'wishlists'
  ]
  loop
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- 5. Least privilege: anon/authenticated must not be able to write storefront
--    data directly. (Writes happen server-side through the privileged role.)
revoke insert, update, delete on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;
grant insert, update, delete on public.products, public.categories, public.orders,
  public.order_items, public.payments, public.discount_codes, public.settings,
  public.notifications, public.users, public.newsletter_subscribers, public.wishlists,
  public.sessions to authenticated;

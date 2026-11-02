import { redirect } from "next/navigation";
import { ShieldCheck, KeyRound } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminUser, getCurrentUser, verifyPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AuthForm } from "@/app/(store)/(auth)/auth-form";
import { BrandMark } from "@/components/brand";

export const metadata = { title: "Admin sign in" };
export const dynamic = "force-dynamic";

const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const adminUser = await getAdminUser();
  if (adminUser?.role === "admin") redirect("/admin");
  const user = await getCurrentUser();
  const s = await getSettings();

  // Show the starter login details only while the default password is still in use.
  // Once the owner changes the password (or sets ADMIN_PASSWORD), the box disappears.
  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  const showDefaults =
    !!admin && !process.env.ADMIN_PASSWORD && verifyPassword(DEFAULT_ADMIN_PASSWORD, admin.passwordHash);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="h-5 w-5 text-accent-300" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-400">Secure area</p>
            <h1 className="sr-only">{s.store_name} Admin</h1>
            <BrandMark name={s.store_name} size="sm" tone="on-dark" showBadge={false} className="-ml-0.5" />
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">Admin dashboard</p>
          </div>
        </div>

        {showDefaults && (
          <div className="mt-6 rounded-2xl border border-brand-400/40 bg-brand-500/15 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-brand-200">
              <KeyRound className="h-4 w-4" /> Admin login details
            </p>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-300">Email</dt>
                <dd className="break-all font-mono text-white">{admin.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-300">Password</dt>
                <dd className="font-mono text-white">{DEFAULT_ADMIN_PASSWORD}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-brand-100/80">
              Pre-filled below for convenience. Sign in, then change the password in <strong>Store Settings → Admin password</strong>.
            </p>
          </div>
        )}

        {user && user.role !== "admin" && (
          <p className="mt-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            You are signed in as a customer ({user.email}). Sign in with an administrator account to continue.
          </p>
        )}

        <div className="mt-6 [&_.input]:border-white/15 [&_.input]:bg-white/5 [&_.input]:text-white [&_.label]:text-neutral-300">
          <AuthForm
            mode="login"
            admin
            next="/admin"
            initialError={error}
            defaultEmail={showDefaults ? admin.email : ""}
            defaultPassword={showDefaults ? DEFAULT_ADMIN_PASSWORD : ""}
          />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          <a href="/" className="hover:text-white">← Back to storefront</a>
        </p>
      </div>
    </div>
  );
}

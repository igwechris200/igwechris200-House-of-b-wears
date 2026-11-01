import { redirect } from "next/navigation";
import { ShieldCheck, KeyRound } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminUser, getCurrentUser, verifyPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AuthForm } from "@/app/(store)/(auth)/auth-form";
import { Logo } from "@/components/store/logo";

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
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <Logo name={s.store_name} logoUrl={s.logo_url} logoDarkUrl={s.logo_dark_url} dark imgClassName="h-14 w-auto object-contain" />
          </span>
          <div>
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure admin area
            </p>
            <h1 className="mt-1 font-serif text-2xl">Store Owner Sign In</h1>
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

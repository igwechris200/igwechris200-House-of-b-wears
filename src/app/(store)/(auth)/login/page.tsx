import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : next || "/account");
  }

  const [admin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  const showDefaults =
    !!admin && !process.env.ADMIN_PASSWORD && verifyPassword(DEFAULT_ADMIN_PASSWORD, admin.passwordHash);

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-2 font-serif text-3xl">Sign in to your account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter your email and password to view your orders or manage the store.
        </p>
        <AuthForm mode="login" next={next} initialError={error} />
        <p className="mt-6 text-center text-sm text-neutral-500">
          New customer?{" "}
          <a
            href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-bold text-brand-600 underline-offset-4 hover:underline"
          >
            Create an account
          </a>
        </p>
        <div className="mt-6 border-t border-neutral-200 pt-5">
          {showDefaults ? (
            <form action="/api/auth/login" method="POST" className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <input type="hidden" name="email" value={admin.email} />
              <input type="hidden" name="password" value={DEFAULT_ADMIN_PASSWORD} />
              <input type="hidden" name="admin" value="1" />
              <input type="hidden" name="next" value="/admin" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                    <ShieldCheck className="h-4 w-4" /> Store Owner / Admin
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-600">{admin.email}</p>
                </div>
                <button type="submit" className="btn-primary shrink-0 !px-4 !py-2 text-xs">
                  Open Admin Dashboard →
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <a
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 transition hover:text-brand-600"
              >
                <ShieldCheck className="h-4 w-4 text-brand-600" /> Store owner? Go to Admin Sign In →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

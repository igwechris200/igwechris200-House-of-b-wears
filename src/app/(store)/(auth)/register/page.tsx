import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || (user.role === "admin" ? "/admin" : "/account"));

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Join us</p>
        <h1 className="mt-2 font-serif text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Track orders, save your delivery details and check out faster.
        </p>
        <AuthForm mode="register" next={next} initialError={error} />
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <a
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-bold text-brand-600 underline-offset-4 hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

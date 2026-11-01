"use client";

import { useState, type ReactNode } from "react";

export type AdminActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
};

export async function postAdminAction(fd: FormData): Promise<AdminActionResult> {
  const res = await fetch("/api/admin/action", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || "Could not complete this action." };
  }
  return {
    ok: true,
    message: data.message,
    redirectTo: data.redirectTo,
  };
}

export function AdminActionForm({
  intent,
  confirmMessage,
  reloadOnSuccess = true,
  className,
  children,
  onSuccess,
}: {
  intent: string;
  confirmMessage?: string;
  reloadOnSuccess?: boolean;
  className?: string;
  children: ReactNode;
  onSuccess?: (message?: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    if (pending) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    // Capture clicked submitter button name/value if present
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter && submitter.name && !fd.has(submitter.name)) {
      fd.set(submitter.name, submitter.value);
    }

    setPending(true);
    try {
      const result = await postAdminAction(fd);
      if (!result.ok) {
        window.alert(result.error || "Action failed");
        setPending(false);
        return;
      }
      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }
      onSuccess?.(result.message);
      if (reloadOnSuccess) {
        window.location.reload();
        return;
      }
    } catch {
      window.alert("Network error — please try again.");
    }
    setPending(false);
  };

  return (
    <form action="/api/admin/action" method="POST" onSubmit={handleSubmit} className={className}>
      <input type="hidden" name="intent" value={intent} />
      {children}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfileAction, type AuthState } from "../(auth)/actions";
import { NIGERIAN_STATES } from "@/lib/utils";

export function ProfileForm({ user }: { user: { name: string; phone: string; address: string; city: string; state: string } }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div><label className="label">Full name</label><input name="name" defaultValue={user.name} required className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={user.phone} className="input" /></div>
      <div><label className="label">Address</label><input name="address" defaultValue={user.address} className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">City</label><input name="city" defaultValue={user.city} className="input" /></div>
        <div>
          <label className="label">State</label>
          <select name="state" defaultValue={user.state || "Lagos"} className="input">
            {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">New password (optional)</label><input name="password" type="password" minLength={6} className="input" placeholder="Leave blank to keep current" /></div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state && !state.error && <p className="text-sm text-emerald-700">Profile updated.</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

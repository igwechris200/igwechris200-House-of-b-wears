"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2, Plus, Eye, EyeOff, ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Switch } from "@/components/admin/switch";
import { AdminActionForm, postAdminAction } from "@/components/admin/admin-action-form";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  active: boolean;
  count: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const formPanelRef = useRef<HTMLElement>(null);

  const formOpen = creating || editing !== null;
  const nextOrder = categories.length ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1;

  const openCreate = () => {
    setError(undefined);
    setSuccess(undefined);
    setCreating(true);
    setEditing(null);
    setTimeout(() => formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const openEdit = (c: CategoryRow) => {
    setError(undefined);
    setSuccess(undefined);
    setEditing(c);
    setCreating(false);
    setTimeout(() => formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await postAdminAction(fd);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    setSuccess(res.message || "Category saved");
    window.location.reload();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-4">
          <p className="text-sm font-semibold">
            {categories.length} categories · {categories.filter((c) => c.active).length} shown on store
          </p>
          <button type="button" onClick={openCreate} className="btn-primary !py-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> New category
          </button>
        </div>
        <ul className="divide-y divide-neutral-100">
          {categories.map((c) => (
            <li key={c.id} className={`flex flex-wrap items-center gap-3 p-4 transition hover:bg-neutral-50 ${!c.active ? "bg-neutral-50/70" : ""}`}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-neutral-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${!c.active ? "text-neutral-500" : ""}`}>{c.name}</p>
                <p className="truncate text-xs text-neutral-500">{c.description || "No description"}</p>
                <a href={`/admin/products?category=${c.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  {c.count} product{c.count === 1 ? "" : "s"}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <AdminActionForm intent="toggleCategory">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="value" value={String(!c.active)} />
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                      c.active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-neutral-300 text-neutral-500"
                    }`}
                  >
                    {c.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {c.active ? "Shown" : "Hidden"}
                  </button>
                </AdminActionForm>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-lg border border-neutral-200 p-2 transition hover:bg-black hover:text-white"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <AdminActionForm
                  intent="deleteCategory"
                  confirmMessage={`Delete “${c.name}”? Its products will become uncategorised (they stay in the catalogue).`}
                >
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-200 p-2 text-red-600 transition hover:bg-red-600 hover:text-white"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AdminActionForm>
              </div>
            </li>
          ))}
          {categories.length === 0 && <li className="p-10 text-center text-sm text-neutral-400">No categories yet. Create your first one.</li>}
        </ul>
      </div>

      <aside ref={formPanelRef} className="card h-fit p-5 sm:p-6 xl:sticky xl:top-24">
        {formOpen ? (
          <form action="/api/admin/action" method="POST" onSubmit={handleSave} key={editing?.id ?? "new"} className="space-y-4">
            <input type="hidden" name="intent" value="saveCategory" />
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl">{creating ? "New category" : `Edit “${editing?.name}”`}</h2>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="text-xs text-neutral-500 hover:underline"
              >
                Close
              </button>
            </div>
            {editing?.id && <input type="hidden" name="id" value={editing.id} />}
            <div>
              <label className="label">Category name</label>
              <input name="name" required defaultValue={editing?.name ?? ""} className="input" placeholder="e.g. Jackets" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} className="input" placeholder="Shown on the category page" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Display order</label>
                <input name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? nextOrder} className="input" />
              </div>
              <div className="flex items-end">
                <div className="w-full">
                  <Switch name="active" label="Show on store" defaultChecked={editing?.active ?? true} />
                </div>
              </div>
            </div>
            <ImageUploader name="image" initial={editing?.image ? [editing.image] : []} multiple={false} label="Category image" />
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Saving…" : "Save category"}
            </button>
          </form>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-neutral-500">Select a category to edit it, or create a new one.</p>
            <button type="button" onClick={openCreate} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> New category
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

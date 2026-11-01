import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { HeaderClient } from "./header-client";
export { Logo } from "./logo";

export async function Header() {
  const [s, user, cats] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  return (
    <HeaderClient
      storeName={s.store_name}
      logoUrl={s.logo_url}
      logoDarkUrl={s.logo_dark_url}
      topMessage={s.announcement}
      user={user ? { name: user.name, role: user.role } : null}
      categories={cats.map((c) => ({ name: c.name, slug: c.slug }))}
    />
  );
}

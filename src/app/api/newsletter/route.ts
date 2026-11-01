import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    const inserted = await db
      .insert(newsletterSubscribers)
      .values({ email: email.toLowerCase().trim() })
      .onConflictDoNothing()
      .returning({ id: newsletterSubscribers.id });
    return Response.json({
      message: inserted.length ? "You're on the list! Welcome to the inner circle." : "You're already subscribed — thank you!",
    });
  } catch {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

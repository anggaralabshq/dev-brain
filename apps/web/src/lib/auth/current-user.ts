/**
 * Server-side helper to get current user from session.
 * Replaces the hardcoded CURRENT_USER_ID constant.
 */
import "server-only";
import { auth } from "@/lib/auth/config";
import { db } from "@devbrain/db";
import { users } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Dev-only bypass, gated by an explicit env var never set outside local .env
  // (gitignored, absent from .env.example). Returns the first real user row so
  // vault data still scopes to a real uuid. NODE_ENV is "production" even in
  // this local docker-compose stack (standalone build), so it can't gate this.
  if (process.env.DEV_SKIP_AUTH === "true") {
    const [devUser] = await db
      .select({ id: users.id, email: users.email, name: users.name, image: users.image })
      .from(users)
      .limit(1);
    if (devUser) return devUser;
  }

  const session = await auth();
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user ?? null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

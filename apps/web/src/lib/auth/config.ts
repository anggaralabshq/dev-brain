/**
 * Full Auth.js v5 configuration — uses database.
 * Used by server actions, route handlers, and getCurrentUser().
 */
import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@devbrain/db";
import { users, accounts, sessions, verificationTokens } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./edge-config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
});

const providers = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@example.com" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase();

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        return {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          image: existing.image,
        };
      }

      // Auto-create user (dev convenience)
      const name = email.split("@")[0].replace(/[._-]/g, " ");
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
        })
        .returning();

      return {
        id: created.id,
        email: created.email,
        name: created.name,
        image: created.image,
      };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
});

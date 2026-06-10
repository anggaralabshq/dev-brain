import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@devbrain/db";
import { users, accounts, sessions, verificationTokens } from "@devbrain/db/schema";
import { authConfig } from "./edge-config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const allowedLogin = process.env.ALLOWED_GITHUB_LOGIN?.toLowerCase().trim();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!allowedLogin) return true; // no restriction if env var not set
      const login = (profile?.login as string | undefined)?.toLowerCase().trim();
      return login === allowedLogin;
    },
  },
});

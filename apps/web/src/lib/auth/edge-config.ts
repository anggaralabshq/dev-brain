/**
 * Edge-safe auth config — NO database, NO Node.js modules.
 * Used by middleware (which runs in edge runtime).
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [], // Providers added in main config (need DB)
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/auth/error" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
};

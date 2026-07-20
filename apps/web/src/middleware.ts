import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/edge-config";

// Edge-safe auth — no database imports here
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/auth/error", "/api/auth", "/_next", "/favicon.ico"];

// Paths that bypass subdomain rewriting (handled at root regardless of subdomain)
const SKIP_REWRITE_PREFIXES = ["/api", "/share", "/login", "/auth", "/_next", "/favicon.ico"];

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "anggaralabs.lol";

function getSubdomain(host: string): string | null {
  if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) return null;
  const withoutPort = host.split(":")[0];
  if (withoutPort.endsWith(`.${APP_DOMAIN}`)) {
    return withoutPort.slice(0, withoutPort.length - APP_DOMAIN.length - 1);
  }
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const subdomain = getSubdomain(host);
  const isLoggedIn = !!req.auth;

  // brain.anggaralabs.lol → rewrite to /devbrain/*
  if (subdomain === "brain") {
    const skip = SKIP_REWRITE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!skip && !pathname.startsWith("/devbrain")) {
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      const url = req.nextUrl.clone();
      url.pathname = `/devbrain${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // vault.anggaralabs.lol → rewrite to /vaultkey/*
  if (subdomain === "vault") {
    // Dev-only bypass, gated by an explicit env var (see lib/auth/current-user.ts
    // for the matching bypass that lets vault server actions resolve a real user).
    const devSkipAuth = process.env.DEV_SKIP_AUTH === "true";
    const skip = SKIP_REWRITE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!skip && !pathname.startsWith("/vaultkey")) {
      if (!isLoggedIn && !devSkipAuth) {
        const loginUrl = new URL("/login", req.nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      const url = req.nextUrl.clone();
      url.pathname = `/vaultkey${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Root domain "/" is the public superapp hub
  if (pathname === "/" && !subdomain) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

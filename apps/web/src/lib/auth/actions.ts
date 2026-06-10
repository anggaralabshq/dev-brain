"use server";

/**
 * Auth server actions — wrappers around signIn/signOut for use in client components.
 */
import { signIn, signOut } from "@/lib/auth/config";

export async function signInWithCredentials(email: string, callbackUrl: string) {
  try {
    await signIn("credentials", {
      email,
      redirectTo: callbackUrl,
    });
    return { ok: true as const };
  } catch (err) {
    // Auth.js v5 throws a special error for redirects that we should re-throw
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return { ok: false as const, error: (err as Error).message };
  }
}

export async function signInWithGitHub(callbackUrl: string) {
  try {
    await signIn("github", { redirectTo: callbackUrl });
    return { ok: true as const };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return { ok: false as const, error: (err as Error).message };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

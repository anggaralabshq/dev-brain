"use server";

import { signIn, signOut } from "@/lib/auth/config";

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

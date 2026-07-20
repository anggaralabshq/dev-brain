import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { VaultKeyProvider } from "@/contexts/vault-key-context";

export const metadata: Metadata = {
  title: "VaultKey — Password Manager",
  description: "Self-hosted, zero-knowledge password manager.",
};

export default async function VaultKeyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth on top of the middleware gate — an auth bypass here has
  // maximal consequence, so this app checks again rather than trusting the edge only.
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <VaultKeyProvider>{children}</VaultKeyProvider>
    </div>
  );
}

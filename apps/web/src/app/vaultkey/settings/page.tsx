"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useVaultKey } from "@/contexts/vault-key-context";
import { SetupScreen } from "@/components/vault/setup-screen";
import { UnlockScreen } from "@/components/vault/unlock-screen";
import { ChangeMasterPasswordForm } from "@/components/vault/change-master-password-form";
import { SecurityPrefsForm } from "@/components/vault/security-prefs-form";
import { DangerZone } from "@/components/vault/danger-zone";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function VaultKeySettingsPage() {
  const { status } = useVaultKey();

  if (status === "loading") return null;
  if (status === "needs-setup") return <SetupScreen />;
  if (status === "locked") return <UnlockScreen />;

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to vault
      </Link>
      <h1 className="mb-8 text-xl font-semibold">Settings</h1>

      <Section title="Master password">
        <ChangeMasterPasswordForm />
      </Section>

      <Section title="Security">
        <SecurityPrefsForm />
      </Section>

      <DangerZone />
    </div>
  );
}

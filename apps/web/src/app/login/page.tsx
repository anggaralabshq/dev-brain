import { headers } from "next/headers";
import { Brain, GitBranch, FileText, CheckSquare, Network, KeyRound, Lock, Shuffle, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getSubdomain } from "@/lib/subdomain";

const BRANDS = {
  brain: {
    name: "DevBrain",
    icon: Brain,
    heading: (
      <>
        Your second brain
        <br />
        for development work.
      </>
    ),
    tagline: "Keep projects, decisions, and knowledge organized in one place. Built for developers who think in systems.",
    features: [
      { icon: FileText, label: "Notes & Knowledge Base" },
      { icon: CheckSquare, label: "Task Management" },
      { icon: GitBranch, label: "Architecture Decision Records" },
      { icon: Network, label: "Diagrams & Whiteboards" },
    ],
  },
  vault: {
    name: "VaultKey",
    icon: KeyRound,
    heading: (
      <>
        Your passwords,
        <br />
        zero-knowledge.
      </>
    ),
    tagline: "Self-hosted password manager. Your master password never leaves your browser — not even we can read your vault.",
    features: [
      { icon: Lock, label: "AES-256 End-to-End Encryption" },
      { icon: ShieldCheck, label: "Master Password Never Leaves Browser" },
      { icon: Shuffle, label: "Password Generator" },
      { icon: KeyRound, label: "Folders & Auto-Lock" },
    ],
  },
} as const;

const DEFAULT_BRAND = BRANDS.brain;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const host = (await headers()).get("host") ?? "";
  const subdomain = getSubdomain(host);
  const brand = (subdomain && subdomain in BRANDS ? BRANDS[subdomain as keyof typeof BRANDS] : DEFAULT_BRAND);
  const Icon = brand.icon;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">{brand.name}</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-snug">{brand.heading}</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{brand.tagline}</p>
          </div>

          <div className="space-y-3">
            {brand.features.map(({ icon: FeatureIcon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <FeatureIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>

      {/* Right panel — login */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">{brand.name}</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your GitHub account to continue.
            </p>
          </div>

          <LoginForm searchParams={searchParams} />

          <p className="text-center text-[11px] text-muted-foreground">
            Access is granted via GitHub OAuth.{" "}
            <br className="hidden sm:block" />
            Your profile info is only used to identify you.
          </p>
        </div>
      </div>
    </div>
  );
}

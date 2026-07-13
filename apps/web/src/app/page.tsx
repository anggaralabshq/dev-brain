import Link from "next/link";
import { Brain, ArrowUpRight } from "lucide-react";

const APPS = [
  {
    name: "DevBrain",
    description: "Second brain for developers. Notes, projects, architecture, and deep focus — all in one place.",
    href: process.env.NEXT_PUBLIC_DEVBRAIN_URL ?? "https://brain.anggaralabs.lol",
    icon: Brain,
  },
];

const COMING_SOON = [
  { name: "FinanceOS", description: "Personal finance tracker built for engineers." },
  { name: "HealthLog", description: "Habits, workouts, and biometrics — unified." },
];

function AbstractMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="12" height="12" rx="2.5" fill="currentColor" />
      <rect x="18" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="18" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="18" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}

export default function HubPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">

      {/* Nav */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <AbstractMark size={20} />
          <span className="text-sm font-semibold tracking-tight">AnggaraLabs</span>
        </div>
        <a
          href="mailto:wisnuanggara0001@gmail.com"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Contact
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 sm:px-10 pt-24 pb-16">
        <div className="text-foreground mb-10">
          <AbstractMark size={52} />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center mb-4 max-w-lg leading-[1.1]">
          A personal suite of focused tools
        </h1>
        <p className="text-muted-foreground text-center max-w-sm text-base leading-relaxed mb-20">
          Each app does one thing well. Built for how I actually work.
        </p>

        {/* Apps */}
        <div className="w-full max-w-xl">
          <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-5">
            Apps
          </p>

          {/* Featured live app card */}
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.name}
                href={app.href}
                className="group block rounded-xl border border-border/60 bg-card p-6 mb-3 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted/60 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground/70" />
                    </div>
                    <span className="font-semibold text-sm">{app.name}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                    Live
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {app.description}
                </p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Open app <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}

          {/* Coming soon — dotted rows */}
          <div className="mt-6 flex flex-col gap-3">
            {COMING_SOON.map((app) => (
              <div key={app.name} className="flex items-center gap-0 text-sm text-muted-foreground/50">
                <span className="shrink-0">{app.name}</span>
                <span className="flex-1 mx-3 border-b border-dashed border-border/40" />
                <span className="shrink-0 text-[11px] tracking-wide">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-6 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} AnggaraLabs</span>
        <span>Wisnu Anggara</span>
      </footer>
    </div>
  );
}

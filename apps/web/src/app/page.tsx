import Link from "next/link";
import { Brain, ArrowRight, Sparkles } from "lucide-react";

const APPS = [
  {
    name: "DevBrain",
    description: "Second brain for developers. Notes, projects, architecture diagrams, and deep focus — all connected.",
    href: process.env.NEXT_PUBLIC_DEVBRAIN_URL ?? "https://brain.anggaralabs.lol",
    icon: Brain,
    tag: "Live",
    tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    borderHover: "hover:border-violet-500/40",
    glow: "hover:shadow-violet-500/10",
  },
];

const COMING_SOON = [
  { name: "FinanceOS", description: "Personal finance tracker built for engineers." },
  { name: "HealthLog", description: "Habits, workouts, and biometrics in one place." },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border/40 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </span>
          <span className="font-semibold tracking-tight">AnggaraLabs</span>
        </div>
        <span className="text-xs text-muted-foreground border border-border/50 rounded-full px-3 py-1">
          Personal Suite
        </span>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center mb-16 max-w-xl">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border/50 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            Your personal{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-300">
              superapps
            </span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A suite of focused tools built for how you actually work.
            Each app does one thing, and does it well.
          </p>
        </div>

        {/* Apps */}
        <div className="w-full max-w-4xl">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4 px-1">
            Apps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.name}
                  href={app.href}
                  className={`group relative rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${app.borderHover} ${app.glow}`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg ${app.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${app.iconColor}`} />
                    </div>
                    <span className={`text-[11px] font-medium border rounded-full px-2 py-0.5 ${app.tagColor}`}>
                      {app.tag}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold mb-1">{app.name}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    Open app <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}

            {/* Coming soon */}
            {COMING_SOON.map((app) => (
              <div
                key={app.name}
                className="rounded-xl border border-border/30 bg-card/40 p-5 flex flex-col gap-4 opacity-50 cursor-not-allowed select-none"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <div className="w-4 h-4 rounded bg-border" />
                  </div>
                  <span className="text-[11px] font-medium border border-border/50 rounded-full px-2 py-0.5 text-muted-foreground">
                    Soon
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold mb-1">{app.name}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} AnggaraLabs</span>
          <span>Built by Wisnu Anggara</span>
        </div>
      </footer>
    </div>
  );
}

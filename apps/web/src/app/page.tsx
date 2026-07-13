// ponytail: placeholder hub — replace when more apps exist
import Link from "next/link";
import { Brain } from "lucide-react";

const APPS = [
  {
    name: "DevBrain",
    description: "Second brain for developers. Notes, projects, architecture, focus.",
    href: process.env.NEXT_PUBLIC_DEVBRAIN_URL ?? "https://brain.anggaralabs.lol",
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">AnggaraLabs</h1>
        <p className="text-muted-foreground">Your personal superapps suite</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.name}
              href={app.href}
              className={`rounded-xl border p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform ${app.bg}`}
            >
              <Icon className={`w-8 h-8 ${app.color}`} />
              <div>
                <h2 className="font-semibold text-lg">{app.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{app.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

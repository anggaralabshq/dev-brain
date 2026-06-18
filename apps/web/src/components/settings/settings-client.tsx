"use client";

import { useState, useEffect, useTransition } from "react";
import {
  User, Palette, Bell, Plug, Info, Shield,
  Check, Monitor, Sun, Moon, Github, Slack,
  ChevronRight, Lock, KeyRound, LogOut,
  Globe, Zap, Mail, MessageSquare, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getPomodoroSettings, updatePomodoroSettings } from "@/lib/actions/pomodoro";

type Section = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INPUT_CLS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60";
const LABEL_CLS = "mb-1 block text-xs font-medium text-muted-foreground";

type Theme = "dark" | "light" | "system";
const THEME_KEY = "devbrain:theme";
const SIDEBAR_KEY = "devbrain:sidebar:collapsed";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

type PomodoroForm = {
  workDurationMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakAfter: number;
  autoStartBreaks: boolean;
  dailyGoal: number;
};

const POMO_DEFAULTS: PomodoroForm = {
  workDurationMin: 25,
  shortBreakMin: 5,
  longBreakMin: 20,
  longBreakAfter: 4,
  autoStartBreaks: false,
  dailyGoal: 8,
};

function NumStepper({
  label, description, value, min, max, step = 1,
  onChange,
}: {
  label: string; description?: string;
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-accent text-sm font-medium"
        >−</button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-accent text-sm font-medium"
        >+</button>
      </div>
    </div>
  );
}

function FocusSettingsPanel() {
  const [form, setForm] = useState<PomodoroForm>(POMO_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPomodoroSettings().then((res) => {
      if (res.ok && res.settings) {
        setForm({
          workDurationMin: res.settings.workDurationMin,
          shortBreakMin:   res.settings.shortBreakMin,
          longBreakMin:    res.settings.longBreakMin,
          longBreakAfter:  res.settings.longBreakAfter,
          autoStartBreaks: res.settings.autoStartBreaks,
          dailyGoal:       res.settings.dailyGoal,
        });
      }
      setLoaded(true);
    });
  }, []);

  const set = (key: keyof PomodoroForm) => (v: number | boolean) =>
    setForm((f) => ({ ...f, [key]: v }));

  const save = () => {
    startTransition(async () => {
      await updatePomodoroSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  if (!loaded) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Session Durations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <NumStepper label="Work duration" description="Minutes per focus session." value={form.workDurationMin} min={5} max={90} step={5} onChange={set("workDurationMin")} />
          <NumStepper label="Short break"   description="Break after each session."  value={form.shortBreakMin}   min={1} max={30} step={1} onChange={set("shortBreakMin")} />
          <NumStepper label="Long break"    description="Break after N sessions."     value={form.longBreakMin}    min={5} max={60} step={5} onChange={set("longBreakMin")} />
          <NumStepper label="Long break after" description="Sessions before long break." value={form.longBreakAfter} min={2} max={8} step={1} onChange={set("longBreakAfter")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Daily Goal</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <NumStepper label="Target pomodoros" description="Sessions to complete each day." value={form.dailyGoal} min={1} max={20} step={1} onChange={set("dailyGoal")} />
          <Toggle
            checked={form.autoStartBreaks}
            onChange={(v) => set("autoStartBreaks")(v)}
            label="Auto-start breaks"
            description="Automatically begin break timer after a session."
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3 w-3" /> Saved</span>}
      </div>
    </div>
  );
}

function SectionPanel({ active, user }: { active: string; user: CurrentUser | null }) {
  // Appearance state
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarDefault, setSidebarDefault] = useState(false);

  // Notification state
  const [notifs, setNotifs] = useState({
    taskDeadlines: true,
    meetingReminders: true,
    projectUpdates: false,
    weeklyDigest: true,
    email: false,
  });

  useEffect(() => {
    const t = (localStorage.getItem(THEME_KEY) as Theme) || "dark";
    setTheme(t);
    setSidebarDefault(localStorage.getItem(SIDEBAR_KEY) === "true");
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    const html = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (t === "dark" || (t === "system" && prefersDark)) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }

  if (active === "profile") {
    const initials = user?.name
      ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
      : "??";

    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name ?? "Guest"}</p>
                <p className="text-xs text-muted-foreground">{user?.email ?? "Not signed in"}</p>
                <Button variant="outline" size="sm" className="mt-2 text-xs" disabled>
                  Change Avatar
                </Button>
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Display Name</label>
              <input
                type="text"
                defaultValue={user?.name ?? ""}
                disabled
                className={INPUT_CLS}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Name editing available after authentication is set up.
              </p>
            </div>

            <div>
              <label className={LABEL_CLS}>Email</label>
              <input type="email" defaultValue={user?.email ?? ""} disabled className={INPUT_CLS} />
            </div>

            <div>
              <label className={LABEL_CLS}>Role</label>
              <input type="text" value="Developer" disabled className={INPUT_CLS} readOnly />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active === "appearance") {
    const themes: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { value: "dark",   label: "Dark",   icon: Moon },
      { value: "light",  label: "Light",  icon: Sun },
      { value: "system", label: "System", icon: Monitor },
    ];

    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => applyTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors hover:bg-accent",
                    theme === t.value ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <t.icon className={cn("h-5 w-5", theme === t.value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", theme === t.value ? "text-primary" : "text-muted-foreground")}>
                    {t.label}
                  </span>
                  {theme === t.value && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sidebar</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Toggle
              checked={sidebarDefault}
              onChange={(v) => {
                setSidebarDefault(v);
                localStorage.setItem(SIDEBAR_KEY, String(v));
                window.dispatchEvent(new CustomEvent("devbrain:sidebar:collapsed", { detail: { collapsed: v } }));
              }}
              label="Collapsed by default"
              description="Start with sidebar collapsed on page load."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Density</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Compact / comfortable / spacious — coming soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active === "notifications") {
    const toggleNotif = (key: keyof typeof notifs) =>
      setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">In-App Notifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Toggle checked={notifs.taskDeadlines}    onChange={() => toggleNotif("taskDeadlines")}    label="Task deadlines"       description="Remind me before tasks are due." />
            <Toggle checked={notifs.meetingReminders} onChange={() => toggleNotif("meetingReminders")} label="Meeting reminders"    description="15 minutes before each meeting." />
            <Toggle checked={notifs.projectUpdates}   onChange={() => toggleNotif("projectUpdates")}   label="Project updates"      description="Status changes and new members." />
            <Toggle checked={notifs.weeklyDigest}     onChange={() => toggleNotif("weeklyDigest")}     label="Weekly digest"        description="Summary of activity every Monday." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Toggle
              checked={notifs.email}
              onChange={() => toggleNotif("email")}
              label="Email summaries"
              description="Receive daily email digest of updates."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active === "integrations") {
    const integrations = [
      {
        name: "GitHub",
        description: "Sync repos, issues, and pull requests.",
        icon: Github,
        connected: false,
        badge: null,
      },
      {
        name: "Slack",
        description: "Post notifications to channels.",
        icon: Slack,
        connected: true,
        badge: "#dev-brain",
      },
      {
        name: "Google",
        description: "Sync Google Calendar meetings.",
        icon: Globe,
        connected: false,
        badge: null,
      },
      {
        name: "Zapier",
        description: "Automate workflows with 5000+ apps.",
        icon: Zap,
        connected: false,
        badge: null,
      },
      {
        name: "Email",
        description: "Create notes and tasks via email.",
        icon: Mail,
        connected: false,
        badge: null,
      },
      {
        name: "Notion",
        description: "Import pages and databases.",
        icon: MessageSquare,
        connected: true,
        badge: "Doc sync",
      },
    ];

    return (
      <div className="space-y-4 max-w-xl">
        <p className="text-xs text-muted-foreground">
          Connect external services to enhance your workflow.
        </p>
        <div className="space-y-2">
          {integrations.map((i) => (
            <Card key={i.name}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted">
                    <i.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{i.name}</p>
                      {i.badge && (
                        <Badge variant="outline" className="text-[10px]">{i.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{i.description}</p>
                  </div>
                </div>
                <Button variant={i.connected ? "outline" : "default"} size="sm" className="shrink-0">
                  {i.connected ? "Disconnect" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (active === "security") {
    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Lock,     label: "Change Password",         desc: "Update your account password.", action: "Update" },
              { icon: KeyRound, label: "Two-Factor Authentication", desc: "Add an extra layer of security.", action: "Enable" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-3">
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>{item.action}</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-3">
              <div>
                <p className="text-sm font-medium">Current session</p>
                <p className="text-xs text-muted-foreground">This device · Active now</p>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-3">
              <div className="flex items-center gap-3">
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Sign out all devices</p>
                  <p className="text-xs text-muted-foreground">Revoke all active sessions.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>Sign out all</Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-destructive/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground">Permanently delete all data.</p>
              </div>
              <Button variant="destructive" size="sm" disabled>Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active === "focus") {
    return <FocusSettingsPanel />;
  }

  if (active === "about") {
    const stack = [
      { name: "Next.js",    version: "15.x (App Router)" },
      { name: "Drizzle ORM",version: "latest" },
      { name: "PostgreSQL", version: "16" },
      { name: "tldraw",     version: "v5" },
      { name: "Radix UI",   version: "latest" },
      { name: "Tailwind",   version: "v4" },
    ];

    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <span className="text-2xl font-black text-primary">D</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">DevBrain</h2>
                <p className="text-xs text-muted-foreground">Second Brain for Developers</p>
                <Badge variant="outline" className="mt-1 text-[10px]">v0.1.0-dev</Badge>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Knowledge management for software teams — notes, ADRs, architecture diagrams, tasks, and meetings in one connected workspace.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stack.map((s) => (
                <div key={s.name} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.version}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[
              { label: "Report an issue", href: "https://github.com/anthropics/claude-code/issues" },
            ].map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                {l.label}
                <ChevronRight className="h-3 w-3" />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

const SECTIONS = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "focus",         label: "Focus",         icon: Timer },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations",  label: "Integrations",  icon: Plug },
  { id: "security",      label: "Security",      icon: Shield },
  { id: "about",         label: "About",         icon: Info },
] as const;

export function SettingsClient({ user }: { user: CurrentUser | null }) {
  const [active, setActive] = useState("profile");
  const sections = SECTIONS;

  const activeSection = sections.find((s) => s.id === active);

  return (
    <>
      {/* Left nav */}
      <div className="w-52 shrink-0 border-r border-border p-4 space-y-0.5">
        <p className="px-2.5 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active === s.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <s.icon className="h-4 w-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{activeSection?.label}</h1>
        </div>
        <SectionPanel active={active} user={user} />
      </div>
    </>
  );
}

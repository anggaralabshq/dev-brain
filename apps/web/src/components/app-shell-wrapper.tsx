"use client";

/**
 * Client-side boundary that decides whether to render the AppShell
 * (sidebar + topbar) or just the raw children.
 *
 * Used to hide the shell on /login (and any other public/auth pages).
 */
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { CurrentUser } from "@/lib/auth/current-user";
import { PomodoroProvider } from "@/contexts/pomodoro-context";
import { FocusTimer } from "@/components/pomodoro/focus-timer";
import { SessionCompleteModal } from "@/components/pomodoro/session-complete-modal";

const NO_SHELL_PATHS = new Set<string>([
  "/login",
  "/auth/error",
]);

type StarredProject = { slug: string; name: string; color: string };

export function AppShellWrapper({
  user,
  starredProjects = [],
  projectCount = 0,
  children,
}: {
  user: CurrentUser | null;
  starredProjects?: StarredProject[];
  projectCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname && NO_SHELL_PATHS.has(pathname)) {
    return <>{children}</>;
  }
  return (
    <PomodoroProvider>
      <AppShell user={user} starredProjects={starredProjects} projectCount={projectCount}>{children}</AppShell>
      <FocusTimer />
      <SessionCompleteModal />
    </PomodoroProvider>
  );
}

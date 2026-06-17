import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import type { CurrentUser } from "@/lib/auth/current-user";

type StarredProject = { slug: string; name: string; color: string };

export function AppShell({
  user,
  starredProjects = [],
  projectCount = 0,
  unreadCount = 0,
  children,
}: {
  user: CurrentUser | null;
  starredProjects?: StarredProject[];
  projectCount?: number;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={user} starredProjects={starredProjects} projectCount={projectCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar user={user} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

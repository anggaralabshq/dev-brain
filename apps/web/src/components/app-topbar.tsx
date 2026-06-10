"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, HelpCircle, LogOut, Settings as SettingsIcon,
  User as UserIcon, CheckCircle2, GitBranch, CheckSquare, Users, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const MOCK_NOTIFS = [
  { id: "1", icon: CheckSquare,  color: "text-emerald-400", title: "Task completed",       body: "Deploy pipeline fixed",        when: "2m ago",   read: false },
  { id: "2", icon: GitBranch,    color: "text-amber-400",   title: "New ADR created",       body: "ADR-009: Use tRPC for APIs",   when: "1h ago",   read: false },
  { id: "3", icon: Users,        color: "text-blue-400",    title: "Meeting in 15 min",     body: "Sprint planning — DevOps",     when: "13m ago",  read: false },
  { id: "4", icon: CheckCircle2, color: "text-violet-400",  title: "Project milestone",     body: "AI Bot reached 80% progress", when: "3h ago",   read: true  },
  { id: "5", icon: CheckSquare,  color: "text-green-400",   title: "Task assigned to you",  body: "Review PR #47",               when: "5h ago",   read: true  },
];

function NotificationPanel() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unread = notifs.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  function dismiss(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[9px]"
            >
              {unread}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-7 w-7 opacity-30" />
              <p className="text-xs">No notifications</p>
            </div>
          ) : (
            notifs.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 px-4 py-3 hover:bg-accent",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className={`h-3.5 w-3.5 ${n.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium leading-tight">{n.title}</p>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">{n.when}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {notifs.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 text-center">
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppTopbar({ user }: { user: CurrentUser | null }) {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-card/40 px-5">

      {/* Notifications */}
      <NotificationPanel />

      {/* Help */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {/* User menu */}
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">?</AvatarFallback>
          </Avatar>
        </button>
      )}
    </header>
  );
}

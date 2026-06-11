"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, HelpCircle, LogOut, Settings as SettingsIcon,
  User as UserIcon, Clock, GitBranch, CheckSquare, AlertCircle, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";
import { getNotificationsAction, markNotificationsSeenAction } from "@/lib/actions/notifications";
import type { NotificationItem } from "@/lib/actions/notifications";

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatTimestamp(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const NOTIF_ICONS: Record<NotificationItem["type"], { icon: typeof Clock; color: string }> = {
  meeting_soon:  { icon: Clock,         color: "text-blue-400" },
  task_assigned: { icon: CheckSquare,   color: "text-emerald-400" },
  task_overdue:  { icon: AlertCircle,   color: "text-red-400" },
  task_due_soon: { icon: CheckSquare,   color: "text-amber-400" },
  adr_created:   { icon: GitBranch,     color: "text-violet-400" },
};

function NotificationPanel({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [seenAt, setSeenAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const data = await getNotificationsAction();
    setItems(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      void load();
    }
    if (open) {
      // Mark seen after a short delay so badge updates after user sees items
      const t = setTimeout(async () => {
        await markNotificationsSeenAction();
        setSeenAt(new Date());
        setUnreadCount(0);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [open, loaded, load]);

  const visible = items.filter((n) => !dismissed.has(n.id));
  const unread = (n: NotificationItem) => seenAt === null || n.timestamp > seenAt;

  function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[9px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {visible.some(unread) && (
            <button
              type="button"
              onClick={async () => {
                await markNotificationsSeenAction();
                setSeenAt(new Date());
                setUnreadCount(0);
              }}
              className="text-[11px] text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <span className="text-xs">Loading…</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="h-7 w-7 opacity-30" />
              <p className="text-xs">No notifications</p>
            </div>
          ) : (
            visible.map((n) => {
              const { icon: Icon, color } = NOTIF_ICONS[n.type];
              const isUnread = unread(n);
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(n.href)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(n.href)}
                  className={cn(
                    "group flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-accent",
                    isUnread && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium leading-tight">{n.title}</p>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                      {formatTimestamp(new Date(n.timestamp))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => dismiss(n.id, e)}
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {visible.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 text-center">
            <span className="text-[11px] text-muted-foreground">
              {visible.length} notification{visible.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppTopbar({ user, unreadCount = 0 }: { user: CurrentUser | null; unreadCount?: number }) {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-card/40 px-5">

      {/* Notifications */}
      <NotificationPanel initialUnreadCount={unreadCount} />

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

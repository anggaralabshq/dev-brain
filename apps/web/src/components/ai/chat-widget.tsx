"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle, X, Send, Trash2, ChevronDown,
  FileText, FolderOpen, CheckSquare, BookOpen, ExternalLink,
  PlusCircle, Loader2, CheckCircle2, AlertCircle,
  PenSquare, Calendar, Minus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ContextEntity } from "@/lib/ai/context";
import type { AIAction, AIActionResult } from "@/lib/ai/types";
import { executeAIAction } from "@/lib/actions/ai";

type Suggestion = ContextEntity;

type PendingAction = AIAction & {
  state: "idle" | "loading" | "done" | "error";
  result?: AIActionResult;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  suggestions?: Suggestion[];
  pendingActions?: PendingAction[];
};

const ENTITY_ICONS: Record<Suggestion["type"], React.ElementType> = {
  note: FileText,
  project: FolderOpen,
  task: CheckSquare,
  adr: BookOpen,
};

const ENTITY_LABELS: Record<Suggestion["type"], string> = {
  note: "Note",
  project: "Project",
  task: "Tasks",
  adr: "ADR",
};

export function AIChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const projectSlug = pathname?.match(/^\/projects\/([^/]+)/)?.[1] ?? null;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setChatId(null);
    setMessages([]);
  }, [projectSlug]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const runAction = async (msgIdx: number, actionIdx: number) => {
    setMessages((prev) => {
      const copy = [...prev];
      const actions = [...(copy[msgIdx].pendingActions ?? [])];
      actions[actionIdx] = { ...actions[actionIdx], state: "loading" };
      copy[msgIdx] = { ...copy[msgIdx], pendingActions: actions };
      return copy;
    });

    const action = messages[msgIdx].pendingActions![actionIdx];
    const result = await executeAIAction(action);

    setMessages((prev) => {
      const copy = [...prev];
      const actions = [...(copy[msgIdx].pendingActions ?? [])];
      actions[actionIdx] = { ...actions[actionIdx], state: result.ok ? "done" : "error", result };
      copy[msgIdx] = { ...copy[msgIdx], pendingActions: actions };
      return copy;
    });
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", pending: true }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, chatId, projectSlug }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `Error: ${err.error}` };
          return copy;
        });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accum = "";
      let resolvedChatId = chatId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              chatId?: string;
              delta?: string;
              finalContent?: string;
              suggestions?: Suggestion[];
              pendingActions?: AIAction[];
            };

            if (parsed.chatId && !resolvedChatId) {
              resolvedChatId = parsed.chatId;
              setChatId(parsed.chatId);
            }

            if (parsed.delta) {
              accum += parsed.delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accum, pending: true };
                return copy;
              });
            }

            // Server stripped action tags — replace with clean content
            if (parsed.finalContent !== undefined) {
              accum = parsed.finalContent;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: accum };
                return copy;
              });
            }

            if (parsed.suggestions) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], suggestions: parsed.suggestions };
                return copy;
              });
            }

            if (parsed.pendingActions) {
              const actions: PendingAction[] = parsed.pendingActions.map((a) => ({ ...a, state: "idle" }));
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], pendingActions: actions };
                return copy;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: accum, pending: false };
        return copy;
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Connection error. Try again." };
        return copy;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, chatId, projectSlug]);

  const clearChat = () => {
    abortRef.current?.abort();
    setChatId(null);
    setMessages([]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          open && "opacity-0 pointer-events-none"
        )}
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border bg-background shadow-2xl transition-all duration-200",
          "w-[360px] sm:w-[420px]",
          open ? "h-[560px] opacity-100 scale-100" : "h-0 opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">DevBrain AI</span>
            {projectSlug && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {projectSlug}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Minimize"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p>Ask anything about your{projectSlug ? " project" : " work"}.</p>
              <p className="text-xs opacity-70">Notes, tasks, decisions — all in context.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <MessageContent content={msg.content} pending={msg.pending} />
                </div>

                {/* Suggestion chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex max-w-[88%] flex-wrap gap-1.5">
                    {msg.suggestions.map((s, j) => {
                      const Icon = ENTITY_ICONS[s.type];
                      return (
                        <button
                          key={j}
                          onClick={() => navigate(s.href)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                            "bg-background hover:bg-muted transition-colors",
                            "text-foreground hover:text-primary"
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="max-w-[140px] truncate">{s.label}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{ENTITY_LABELS[s.type]}</span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action confirmation cards */}
                {msg.pendingActions && msg.pendingActions.length > 0 && (
                  <div className="mt-2 flex max-w-[88%] flex-col gap-2">
                    {msg.pendingActions.map((action, j) => (
                      <ActionCard
                        key={j}
                        action={action}
                        onExecute={() => runAction(i, j)}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send)"
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                "max-h-[120px] min-h-[40px]"
              )}
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const ACTION_TYPE_LABELS: Record<AIAction["type"], string> = {
  create_task: "Create Task",
  update_task_status: "Update Task",
  delete_task: "Delete Task",
  create_note: "Create Note",
  create_whiteboard: "Create Whiteboard",
  create_project: "Create Project",
  create_adr: "Create ADR",
  create_meeting: "Schedule Meeting",
};

const ACTION_TYPE_ICONS: Record<AIAction["type"], React.ElementType> = {
  create_task: CheckSquare,
  update_task_status: PenSquare,
  delete_task: Minus,
  create_note: FileText,
  create_whiteboard: BookOpen,
  create_project: FolderOpen,
  create_adr: BookOpen,
  create_meeting: Calendar,
};

function actionDisplayTitle(action: AIAction): string {
  if (action.type === "create_project") return action.name;
  if (action.type === "update_task_status") return `Mark as ${action.status}`;
  if (action.type === "delete_task") return "Delete task";
  return action.title;
}

function actionDisplaySlug(action: AIAction): string | null {
  if (action.type === "create_project") return null;
  return action.projectSlug;
}

function ActionCard({
  action,
  onExecute,
  onNavigate,
}: {
  action: PendingAction;
  onExecute: () => void;
  onNavigate: (href: string) => void;
}) {
  const Icon = ACTION_TYPE_ICONS[action.type];
  const label = ACTION_TYPE_LABELS[action.type];
  const displayTitle = actionDisplayTitle(action);
  const displaySlug = actionDisplaySlug(action);

  return (
    <div className="rounded-lg border bg-background px-3 py-2.5 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs text-primary">{label}</span>
            {displaySlug && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{displaySlug}</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-foreground">{displayTitle}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {action.state === "idle" && (
          <button
            onClick={onExecute}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <PlusCircle className="h-3 w-3" />
            Execute
          </button>
        )}
        {action.state === "loading" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Creating…
          </span>
        )}
        {action.state === "done" && action.result?.ok && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {action.result.label}
            </span>
            {action.result.href && (
              <button
                onClick={() => onNavigate(action.result!.href!)}
                className="text-xs text-primary underline hover:no-underline"
              >
                Open →
              </button>
            )}
          </div>
        )}
        {action.state === "error" && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {action.result?.error ?? "Failed"}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content, pending }: { content: string; pending?: boolean }) {
  if (!content && pending) {
    return (
      <span className="inline-flex gap-1">
        <span className="animate-bounce [animation-delay:0ms]">·</span>
        <span className="animate-bounce [animation-delay:150ms]">·</span>
        <span className="animate-bounce [animation-delay:300ms]">·</span>
      </span>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words
      prose-p:my-1 prose-p:leading-relaxed
      prose-headings:mt-3 prose-headings:mb-1 prose-headings:font-semibold
      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
      prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4
      prose-li:my-0.5
      prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-background/60 prose-pre:text-xs prose-pre:p-2 prose-pre:rounded prose-pre:overflow-x-auto prose-pre:my-1
      prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-blockquote:my-1
      prose-strong:font-semibold
      prose-a:text-primary prose-a:underline
      prose-hr:my-2 prose-hr:border-muted-foreground/20
      prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {pending && content && <span className="animate-pulse">▌</span>}
    </div>
  );
}

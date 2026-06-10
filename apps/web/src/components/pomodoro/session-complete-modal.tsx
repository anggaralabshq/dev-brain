"use client";

import { useState } from "react";
import { Coffee, SkipForward, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePomodoro } from "@/contexts/pomodoro-context";

export function SessionCompleteModal() {
  const { state, completeSession } = usePomodoro();
  const [note, setNote] = useState("");

  const isOpen = state.status === "complete";

  const handleAction = (action: "break" | "skip" | "done" | "continue") => {
    const opts = { note: note.trim() || undefined };
    if (action === "break") completeSession({ ...opts, takeBreak: true });
    else if (action === "skip") completeSession({ ...opts });
    else if (action === "done") completeSession({ ...opts, markDone: true });
    else if (action === "continue") completeSession({ ...opts, continueTask: true });
    setNote("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleAction("skip"); }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">🍅</span>
            Session complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
            <p className="text-sm font-medium">{state.taskName ?? "Focus session"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Session {state.sessionCount + 1} of {state.estimatedSessions} · {state.todaySessions + 1} today
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Quick note (optional)
            </label>
            <Textarea
              placeholder="What did you accomplish?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex flex-col h-auto gap-1 py-3"
              onClick={() => handleAction("break")}
            >
              <Coffee className="h-4 w-4 text-emerald-400" />
              <span className="text-xs">Take 5 min break</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto gap-1 py-3"
              onClick={() => handleAction("skip")}
            >
              <SkipForward className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">Skip break</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto gap-1 py-3"
              onClick={() => handleAction("done")}
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs">Mark task done</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto gap-1 py-3"
              onClick={() => handleAction("continue")}
            >
              <RefreshCw className="h-4 w-4 text-blue-400" />
              <span className="text-xs">Continue task</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

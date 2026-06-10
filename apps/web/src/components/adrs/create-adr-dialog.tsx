"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ScrollText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAdrAction } from "@/lib/actions/adrs";
import { cn } from "@/lib/utils";

const STATUS = [
  { id: "proposed", label: "Proposed" },
  { id: "accepted", label: "Accepted" },
  { id: "deprecated", label: "Deprecated" },
  { id: "superseded", label: "Superseded" },
];

export function CreateAdrDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("proposed");
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [consequences, setConsequences] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => {
    setTitle("");
    setStatus("proposed");
    setContext("");
    setDecision("");
    setConsequences("");
    setDecisionDate("");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);

    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title);
    fd.append("status", status);
    fd.append("context", context);
    fd.append("decision", decision);
    fd.append("consequences", consequences);
    fd.append("decisionDate", decisionDate);

    startTransition(async () => {
      const result = await createAdrAction(fd);
      if (result.ok) {
        reset();
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New ADR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              New Architecture Decision Record
            </DialogTitle>
            <DialogDescription>
              Document an important architectural decision, its context, and consequences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                placeholder="e.g. Use PostgreSQL with pgvector for embeddings"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <div className="grid grid-cols-4 gap-1">
                {STATUS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      "rounded border px-2 py-1 text-xs",
                      status === s.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Context <span className="font-normal">(what is the issue?)</span>
              </label>
              <Textarea
                placeholder="Describe the forces at play, including technological, business, political, social, and local concerns."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Decision <span className="font-normal">(what did we choose?)</span>
              </label>
              <Textarea
                placeholder="The decision that was made, expressed as a full sentence in active voice ('We will...')."
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Consequences <span className="font-normal">(what becomes easier/harder?)</span>
              </label>
              <Textarea
                placeholder="The resulting context after applying the decision, both positive and negative."
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Decision date
              </label>
              <Input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Creating…" : "Create ADR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

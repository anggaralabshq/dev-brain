"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Network, Loader2 } from "lucide-react";
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
import { createWhiteboardAction } from "@/lib/actions/whiteboards";

export function CreateWhiteboardButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("System Architecture");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWhiteboardAction(projectId, title);
      if (result.ok) {
        setOpen(false);
        router.push(`./architecture/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Diagram
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              New architecture diagram
            </DialogTitle>
            <DialogDescription>
              Open a tldraw canvas. You can draw freely and save at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description (optional)
              </label>
              <Textarea
                placeholder="What does this diagram show?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create diagram
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

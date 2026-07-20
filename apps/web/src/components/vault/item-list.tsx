"use client";

import { Search, Plus, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DecryptedVaultItem } from "@/contexts/vault-key-context";

export function ItemList({
  items,
  search,
  onSearchChange,
  onSelectItem,
  onNewItem,
}: {
  items: DecryptedVaultItem[];
  search: string;
  onSearchChange: (v: string) => void;
  onSelectItem: (item: DecryptedVaultItem) => void;
  onNewItem: () => void;
}) {
  return (
    <div className="flex-1 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={onNewItem}>
          <Plus className="h-4 w-4" />
          New item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <KeyRound className="mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No items yet</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/60">
                <KeyRound className="h-3.5 w-3.5 text-foreground/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, Lock, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { signOutAction } from "@/lib/auth/actions";
import { useVaultKey, type DecryptedVaultItem } from "@/contexts/vault-key-context";
import { SetupScreen } from "@/components/vault/setup-screen";
import { UnlockScreen } from "@/components/vault/unlock-screen";
import { FolderSidebar } from "@/components/vault/folder-sidebar";
import { ItemList } from "@/components/vault/item-list";
import { ItemDetailDialog } from "@/components/vault/item-detail-dialog";
import { ItemFormDialog } from "@/components/vault/item-form-dialog";
import type { VaultItemPayload } from "@/lib/crypto/vault-items";

function VaultShell() {
  const { items, folders, lock, createItem, updateItem, deleteItem, createFolder } = useVaultKey();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | "all">("all");
  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<DecryptedVaultItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DecryptedVaultItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DecryptedVaultItem | null>(null);

  const filtered = useMemo(() => {
    let list = items;
    if (selectedFolderId !== "all") list = list.filter((i) => i.folderId === selectedFolderId);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || i.username.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, selectedFolderId, search]);

  function itemCount(folderId: string | null) {
    return items.filter((i) => i.folderId === folderId).length;
  }

  async function handleFormSubmit(payload: VaultItemPayload, folderId: string | null) {
    if (editingItem) {
      await updateItem(editingItem.id, payload, folderId);
    } else {
      await createItem(payload, folderId);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4" />
          VaultKey
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={lock}>
            <Lock className="h-3.5 w-3.5" />
            Lock
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <FolderSidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelect={setSelectedFolderId}
          itemCount={itemCount}
          onCreateFolder={createFolder}
        />
        <ItemList
          items={filtered}
          search={search}
          onSearchChange={setSearch}
          onSelectItem={setDetailItem}
          onNewItem={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        />
      </div>

      <ItemDetailDialog
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onEdit={() => {
          setEditingItem(detailItem);
          setDetailItem(null);
          setFormOpen(true);
        }}
        onDelete={() => {
          setDeleteTarget(detailItem);
          setDetailItem(null);
        }}
      />

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingItem}
        folders={folders}
        initialFolderId={editingItem?.folderId ?? (selectedFolderId === "all" ? null : selectedFolderId)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteItem(deleteTarget.id)}
      />
    </div>
  );
}

export function VaultApp() {
  const { status } = useVaultKey();

  if (status === "loading") return null;
  if (status === "needs-setup") return <SetupScreen />;
  if (status === "locked") return <UnlockScreen />;
  return <VaultShell />;
}

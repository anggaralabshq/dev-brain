"use client";

import { useState } from "react";
import { useVaultKey } from "@/contexts/vault-key-context";
import {
  AUTO_LOCK_OPTIONS,
  CLIPBOARD_CLEAR_OPTIONS,
  getClipboardClearSeconds,
  setClipboardClearSeconds,
} from "@/lib/vault-prefs";

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function autoLockLabel(minutes: number): string {
  return minutes === 0 ? "Never" : `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function SecurityPrefsForm() {
  const { autoLockMinutes, setAutoLockMinutes } = useVaultKey();
  const [clipboardSeconds, setClipboardSeconds] = useState(getClipboardClearSeconds);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Auto-lock after inactivity
        </label>
        <select
          value={autoLockMinutes}
          onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
          className={SELECT_CLS}
        >
          {AUTO_LOCK_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {autoLockLabel(m)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Clear clipboard after copy
        </label>
        <select
          value={clipboardSeconds}
          onChange={(e) => {
            const v = Number(e.target.value);
            setClipboardSeconds(v);
            setClipboardClearSeconds(v);
          }}
          className={SELECT_CLS}
        >
          {CLIPBOARD_CLEAR_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s} seconds
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

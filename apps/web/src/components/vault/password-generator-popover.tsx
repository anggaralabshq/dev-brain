"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePassword, type PasswordOpts } from "@/lib/crypto/password-generator";

export function PasswordGeneratorPanel({ onUse }: { onUse: (password: string) => void }) {
  const [opts, setOpts] = useState<PasswordOpts>({
    length: 20,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });
  const [preview, setPreview] = useState(() => generatePassword(opts));

  function regenerate(next: PasswordOpts) {
    setOpts(next);
    setPreview(generatePassword(next));
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <code className="truncate font-mono text-xs">{preview}</code>
        <Button type="button" variant="ghost" size="icon" onClick={() => regenerate(opts)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Length</span>
        <input
          type="range"
          min={8}
          max={64}
          value={opts.length}
          onChange={(e) => regenerate({ ...opts, length: Number(e.target.value) })}
          className="flex-1"
        />
        <span className="w-6 text-right">{opts.length}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {(
          [
            ["upper", "A-Z"],
            ["lower", "a-z"],
            ["numbers", "0-9"],
            ["symbols", "!@#"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={opts[key]}
              onChange={(e) => regenerate({ ...opts, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <Button type="button" size="sm" className="w-full" onClick={() => onUse(preview)}>
        Use this password
      </Button>
    </div>
  );
}

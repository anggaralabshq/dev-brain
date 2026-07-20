// Non-secret UI preferences only — plain localStorage, no encryption needed.
const AUTO_LOCK_KEY = "vaultkey:autolock-minutes:v1";
const CLIPBOARD_KEY = "vaultkey:clipboard-clear-seconds:v1";

export const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 0] as const; // 0 = never
export const CLIPBOARD_CLEAR_OPTIONS = [10, 20, 30, 60] as const;
export const DEFAULT_AUTO_LOCK_MINUTES = 5;
export const DEFAULT_CLIPBOARD_CLEAR_SECONDS = 20;

export function getAutoLockMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_AUTO_LOCK_MINUTES;
  const v = localStorage.getItem(AUTO_LOCK_KEY);
  return v !== null ? Number(v) : DEFAULT_AUTO_LOCK_MINUTES;
}

export function setAutoLockMinutes(minutes: number): void {
  localStorage.setItem(AUTO_LOCK_KEY, String(minutes));
}

export function getClipboardClearSeconds(): number {
  if (typeof window === "undefined") return DEFAULT_CLIPBOARD_CLEAR_SECONDS;
  const v = localStorage.getItem(CLIPBOARD_KEY);
  return v !== null ? Number(v) : DEFAULT_CLIPBOARD_CLEAR_SECONDS;
}

export function setClipboardClearSeconds(seconds: number): void {
  localStorage.setItem(CLIPBOARD_KEY, String(seconds));
}

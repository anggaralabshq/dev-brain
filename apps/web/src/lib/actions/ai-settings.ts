"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { getAiSettingsByUserId, upsertAiSettingsByUserId } from "@/lib/db/ai-settings";

function maskKey(key: string): string {
  if (key.length <= 10) return "••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export async function getAiSettingsAction(): Promise<
  | { ok: true; hasKey: boolean; maskedKey: string | null; usingEnvFallback: boolean }
  | { ok: false; error: string }
> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const settings = await getAiSettingsByUserId(user.id);
  const key = settings?.anthropicApiKey ?? null;
  return {
    ok: true,
    hasKey: !!key,
    maskedKey: key ? maskKey(key) : null,
    usingEnvFallback: !key && !!process.env.ANTHROPIC_API_KEY,
  };
}

export async function updateAnthropicApiKeyAction(
  apiKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false, error: "API key required" };

  await upsertAiSettingsByUserId(user.id, { anthropicApiKey: trimmed });
  revalidatePath("/settings");
  return { ok: true };
}

export async function clearAnthropicApiKeyAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  await upsertAiSettingsByUserId(user.id, { anthropicApiKey: null });
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Validates an Anthropic key via GET /v1/models — auth-only check, costs no tokens.
 * Pass `apiKey` to test a value before saving; omit to test the currently stored/env key.
 */
export async function testAnthropicConnectionAction(
  apiKey?: string
): Promise<{ ok: true; model: string } | { ok: false; error: string }> {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false, error: "Not authenticated" };

  const key = apiKey?.trim() || (await getAiSettingsByUserId(user.id))?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "No API key configured" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}` };
    }
    const data = await res.json() as { data?: Array<{ id: string }> };
    return { ok: true, model: data.data?.[0]?.id ?? "connected" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

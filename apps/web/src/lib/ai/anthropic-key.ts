import "server-only";
import { getAiSettingsByUserId } from "@/lib/db/ai-settings";

/** DB key (per-user, set via Settings) takes priority over the env fallback. */
export async function resolveAnthropicApiKey(userId: string): Promise<string | null> {
  const settings = await getAiSettingsByUserId(userId);
  return settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

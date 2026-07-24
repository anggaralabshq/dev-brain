import "server-only";
import { db } from "@devbrain/db";
import { aiSettings } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";

export async function getAiSettingsByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertAiSettingsByUserId(
  userId: string,
  data: { anthropicApiKey: string | null }
) {
  const [result] = await db
    .insert(aiSettings)
    .values({ userId, anthropicApiKey: data.anthropicApiKey, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: aiSettings.userId,
      set: { anthropicApiKey: data.anthropicApiKey, updatedAt: new Date() },
    })
    .returning();
  return result;
}

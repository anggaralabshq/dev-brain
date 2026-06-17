import "server-only";
import { db } from "@devbrain/db";
import { learningItems } from "@devbrain/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LearningStatus } from "@devbrain/db/schema";

export async function getLearningItemsByUser(userId: string) {
  return db
    .select()
    .from(learningItems)
    .where(eq(learningItems.userId, userId))
    .orderBy(desc(learningItems.createdAt));
}

export async function createLearningItem(data: {
  userId: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  category?: string;
  tags?: string[];
  stars?: number;
}) {
  const [item] = await db
    .insert(learningItems)
    .values({
      userId: data.userId,
      title: data.title,
      description: data.description ?? "",
      sourceUrl: data.sourceUrl,
      sourceName: data.sourceName,
      category: data.category,
      tags: data.tags ?? [],
      stars: data.stars,
      status: "backlog",
    })
    .returning();
  return item;
}

export async function updateLearningItemStatus(
  id: string,
  userId: string,
  status: LearningStatus
) {
  const [item] = await db
    .update(learningItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(learningItems.id, id), eq(learningItems.userId, userId)))
    .returning();
  return item;
}

export async function updateLearningItemNote(
  id: string,
  userId: string,
  personalNote: string
) {
  const [item] = await db
    .update(learningItems)
    .set({ personalNote, updatedAt: new Date() })
    .where(and(eq(learningItems.id, id), eq(learningItems.userId, userId)))
    .returning();
  return item;
}

export async function deleteLearningItem(id: string, userId: string) {
  await db
    .delete(learningItems)
    .where(and(eq(learningItems.id, id), eq(learningItems.userId, userId)));
}

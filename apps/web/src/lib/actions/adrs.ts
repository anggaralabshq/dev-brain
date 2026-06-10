"use server";

import { revalidatePath } from "next/cache";
import { db } from "@devbrain/db";
import { adrs } from "@devbrain/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current-user";
import { getNextAdrNumber } from "@/lib/db/adrs";

export async function createAdrAction(formData: FormData) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const projectId = (formData.get("projectId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const status = (formData.get("status") as string) || "proposed";
  const context = (formData.get("context") as string) ?? "";
  const decision = (formData.get("decision") as string) ?? "";
  const consequences = (formData.get("consequences") as string) ?? "";
  const decisionDate = (formData.get("decisionDate") as string) || null;

  if (!projectId) return { ok: false as const, error: "Project is required" };
  if (!title) return { ok: false as const, error: "Title is required" };

  const number = await getNextAdrNumber(projectId);

  const [created] = await db
    .insert(adrs)
    .values({
      projectId,
      number,
      title,
      status: status as "proposed" | "accepted" | "deprecated" | "superseded",
      context,
      decision,
      consequences,
      decisionDate: decisionDate === "" ? null : decisionDate,
      authorId: user.id,
    })
    .returning();

  revalidatePath("/projects");
  return { ok: true as const, id: created.id, number: created.number };
}

export async function updateAdrStatusAction(adrId: string, status: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const validStatuses = ["proposed", "accepted", "deprecated", "superseded"];
  if (!validStatuses.includes(status)) {
    return { ok: false as const, error: "Invalid status" };
  }

  await db
    .update(adrs)
    .set({ status: status as "proposed", updatedAt: new Date() })
    .where(eq(adrs.id, adrId));

  revalidatePath("/projects");
  return { ok: true as const };
}

export async function deleteAdrAction(adrId: string) {
  const user = await requireUser().catch(() => null);
  if (!user) return { ok: false as const, error: "Not authenticated" };

  await db.delete(adrs).where(eq(adrs.id, adrId));
  revalidatePath("/projects");
  return { ok: true as const };
}

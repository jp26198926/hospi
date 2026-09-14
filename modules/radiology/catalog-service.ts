import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { imagingModalities, radiologyProcedures } from "@/db/schema";
import { eq, and, count, ilike, or } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";

// ─── Modalities ──────────────────────────────────────────────────

export async function listModalities() {
  return db.select().from(imagingModalities).orderBy(imagingModalities.name);
}

export async function createModality(
  input: { code: string; name: string },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(imagingModalities)
    .values({ id, code: input.code, name: input.name })
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_MODALITY_CREATED",
    module: "radiology",
    entity: "imaging_modality",
    entityId: id,
    newValues: { code: input.code, name: input.name },
    ...meta,
  });

  return row;
}

// ─── Procedures ──────────────────────────────────────────────────

export async function listProcedures(opts: {
  modalityId?: string;
  active?: boolean;
  search?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.modalityId) conditions.push(eq(radiologyProcedures.modalityId, opts.modalityId));
  if (opts.active !== undefined) conditions.push(eq(radiologyProcedures.active, opts.active));
  if (opts.search) {
    conditions.push(
      or(
        ilike(radiologyProcedures.name, `%${opts.search}%`),
        ilike(radiologyProcedures.code, `%${opts.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: radiologyProcedures.id,
        code: radiologyProcedures.code,
        name: radiologyProcedures.name,
        modalityId: radiologyProcedures.modalityId,
        bodyPart: radiologyProcedures.bodyPart,
        durationMinutes: radiologyProcedures.durationMinutes,
        prepInstructions: radiologyProcedures.prepInstructions,
        active: radiologyProcedures.active,
        createdAt: radiologyProcedures.createdAt,
        updatedAt: radiologyProcedures.updatedAt,
        modalityName: imagingModalities.name,
        modalityCode: imagingModalities.code,
      })
      .from(radiologyProcedures)
      .leftJoin(imagingModalities, eq(radiologyProcedures.modalityId, imagingModalities.id))
      .where(where)
      .orderBy(radiologyProcedures.name)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(radiologyProcedures).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items,
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function createProcedure(
  input: {
    code: string;
    name: string;
    modalityId: string;
    bodyPart?: string | null;
    durationMinutes?: number;
    prepInstructions?: string | null;
    active?: boolean;
  },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(radiologyProcedures)
    .values({
      id,
      code: input.code,
      name: input.name,
      modalityId: input.modalityId,
      bodyPart: input.bodyPart ?? null,
      durationMinutes: input.durationMinutes ?? 30,
      prepInstructions: input.prepInstructions ?? null,
      active: input.active ?? true,
    })
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_PROCEDURE_CREATED",
    module: "radiology",
    entity: "radiology_procedure",
    entityId: id,
    newValues: { code: input.code, name: input.name, modalityId: input.modalityId },
    ...meta,
  });

  return row;
}

export async function updateProcedure(
  id: string,
  input: Partial<{
    code: string;
    name: string;
    modalityId: string;
    bodyPart: string | null;
    durationMinutes: number;
    prepInstructions: string | null;
    active: boolean;
  }>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db
    .select()
    .from(radiologyProcedures)
    .where(eq(radiologyProcedures.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology procedure");
  const existing = rows[0];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.code !== undefined) updateData.code = input.code;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.modalityId !== undefined) updateData.modalityId = input.modalityId;
  if (input.bodyPart !== undefined) updateData.bodyPart = input.bodyPart;
  if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes;
  if (input.prepInstructions !== undefined) updateData.prepInstructions = input.prepInstructions;
  if (input.active !== undefined) updateData.active = input.active;

  const [updated] = await db
    .update(radiologyProcedures)
    .set(updateData)
    .where(eq(radiologyProcedures.id, id))
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_PROCEDURE_UPDATED",
    module: "radiology",
    entity: "radiology_procedure",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

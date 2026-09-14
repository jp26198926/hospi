import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { medications, medicationBatches } from "@/db/schema";
import { eq, and, count, desc, ilike, or, sql } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";

export async function listMedications(opts: {
  active?: boolean;
  search?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.active !== undefined) conditions.push(eq(medications.active, opts.active));
  if (opts.search) {
    conditions.push(
      or(
        ilike(medications.genericName, `%${opts.search}%`),
        ilike(medications.brandName, `%${opts.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: medications.id,
        genericName: medications.genericName,
        brandName: medications.brandName,
        dosageForm: medications.dosageForm,
        strength: medications.strength,
        unit: medications.unit,
        reorderLevel: medications.reorderLevel,
        sellingPrice: medications.sellingPrice,
        active: medications.active,
        createdAt: medications.createdAt,
        updatedAt: medications.updatedAt,
      })
      .from(medications)
      .where(where)
      .orderBy(medications.genericName)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(medications).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items: items.map((m) => ({
      ...m,
      sellingPrice: Number(m.sellingPrice),
    })),
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function getMedicationById(id: string) {
  const rows = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Medication");
  return { ...rows[0], sellingPrice: Number(rows[0].sellingPrice) };
}

export async function createMedication(
  input: {
    genericName: string;
    brandName?: string | null;
    dosageForm: string;
    strength: string;
    unit: string;
    reorderLevel?: number;
    sellingPrice?: number;
    active?: boolean;
  },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(medications)
    .values({
      id,
      genericName: input.genericName,
      brandName: input.brandName ?? null,
      dosageForm: input.dosageForm,
      strength: input.strength,
      unit: input.unit,
      reorderLevel: input.reorderLevel ?? 0,
      sellingPrice: String(input.sellingPrice ?? 0),
      active: input.active ?? true,
    })
    .returning();

  await logAudit({
    userId,
    action: "MEDICATION_CREATED",
    module: "pharmacy",
    entity: "medication",
    entityId: id,
    newValues: {
      genericName: input.genericName,
      dosageForm: input.dosageForm,
      strength: input.strength,
    },
    ...meta,
  });

  return { ...row, sellingPrice: Number(row.sellingPrice) };
}

export async function updateMedication(
  id: string,
  input: Partial<{
    genericName: string;
    brandName: string | null;
    dosageForm: string;
    strength: string;
    unit: string;
    reorderLevel: number;
    sellingPrice: number;
    active: boolean;
  }>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Medication");
  const existing = rows[0];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.genericName !== undefined) updateData.genericName = input.genericName;
  if (input.brandName !== undefined) updateData.brandName = input.brandName;
  if (input.dosageForm !== undefined) updateData.dosageForm = input.dosageForm;
  if (input.strength !== undefined) updateData.strength = input.strength;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.reorderLevel !== undefined) updateData.reorderLevel = input.reorderLevel;
  if (input.sellingPrice !== undefined) updateData.sellingPrice = String(input.sellingPrice);
  if (input.active !== undefined) updateData.active = input.active;

  const [updated] = await db
    .update(medications)
    .set(updateData)
    .where(eq(medications.id, id))
    .returning();

  await logAudit({
    userId,
    action: "MEDICATION_UPDATED",
    module: "pharmacy",
    entity: "medication",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return { ...updated, sellingPrice: Number(updated.sellingPrice) };
}

export async function getMedicationStock(medicationId: string) {
  const medRows = await db
    .select()
    .from(medications)
    .where(eq(medications.id, medicationId))
    .limit(1);
  if (!medRows[0]) throw new NotFoundError("Medication");
  const med = medRows[0];

  const today = new Date().toISOString().split("T")[0];

  const batches = await db
    .select()
    .from(medicationBatches)
    .where(
      and(
        eq(medicationBatches.medicationId, medicationId),
        sql`${medicationBatches.quantity} > 0`
      )
    )
    .orderBy(medicationBatches.expirationDate);

  const totalOnHand = batches.reduce((sum, b) => sum + b.quantity, 0);
  const belowReorder = totalOnHand <= med.reorderLevel;

  return {
    medication: { ...med, sellingPrice: Number(med.sellingPrice) },
    totalOnHand,
    belowReorder,
    reorderLevel: med.reorderLevel,
    batches: batches.map((b) => ({
      ...b,
      isExpired: b.expirationDate < today,
    })),
  };
}

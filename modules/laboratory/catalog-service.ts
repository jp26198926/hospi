import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  labTestCategories,
  labTests,
  labPanels,
  labPanelTests,
  specimenTypes,
} from "@/db/schema";
import { eq, and, count, desc, ilike, or } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";

// ─── Test Categories ─────────────────────────────────────────────

export async function listTestCategories() {
  return db.select().from(labTestCategories).orderBy(labTestCategories.name);
}

export async function createTestCategory(
  input: { name: string; code: string },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(labTestCategories)
    .values({ id, name: input.name, code: input.code })
    .returning();

  await logAudit({
    userId,
    action: "LAB_CATEGORY_CREATED",
    module: "laboratory",
    entity: "lab_test_category",
    entityId: id,
    newValues: { name: input.name, code: input.code },
    ...meta,
  });

  return row;
}

// ─── Tests ───────────────────────────────────────────────────────

export async function listTests(opts: {
  categoryId?: string;
  active?: boolean;
  search?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.categoryId) conditions.push(eq(labTests.categoryId, opts.categoryId));
  if (opts.active !== undefined) conditions.push(eq(labTests.active, opts.active));
  if (opts.search) {
    conditions.push(
      or(ilike(labTests.name, `%${opts.search}%`), ilike(labTests.code, `%${opts.search}%`))
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: labTests.id,
        code: labTests.code,
        name: labTests.name,
        categoryId: labTests.categoryId,
        specimenType: labTests.specimenType,
        unit: labTests.unit,
        referenceRangeLow: labTests.referenceRangeLow,
        referenceRangeHigh: labTests.referenceRangeHigh,
        referenceRangeText: labTests.referenceRangeText,
        active: labTests.active,
        createdAt: labTests.createdAt,
        updatedAt: labTests.updatedAt,
        categoryName: labTestCategories.name,
      })
      .from(labTests)
      .leftJoin(labTestCategories, eq(labTests.categoryId, labTestCategories.id))
      .where(where)
      .orderBy(labTests.name)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(labTests).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items: items.map((t) => ({
      ...t,
      referenceRangeLow: t.referenceRangeLow != null ? Number(t.referenceRangeLow) : null,
      referenceRangeHigh: t.referenceRangeHigh != null ? Number(t.referenceRangeHigh) : null,
    })),
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function createTest(
  input: {
    code: string;
    name: string;
    categoryId?: string | null;
    specimenType?: string | null;
    unit?: string | null;
    referenceRangeLow?: number | null;
    referenceRangeHigh?: number | null;
    referenceRangeText?: string | null;
    active?: boolean;
  },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(labTests)
    .values({
      id,
      code: input.code,
      name: input.name,
      categoryId: input.categoryId ?? null,
      specimenType: input.specimenType ?? null,
      unit: input.unit ?? null,
      referenceRangeLow: input.referenceRangeLow != null ? String(input.referenceRangeLow) : null,
      referenceRangeHigh: input.referenceRangeHigh != null ? String(input.referenceRangeHigh) : null,
      referenceRangeText: input.referenceRangeText ?? null,
      active: input.active ?? true,
    })
    .returning();

  await logAudit({
    userId,
    action: "LAB_TEST_CREATED",
    module: "laboratory",
    entity: "lab_test",
    entityId: id,
    newValues: { code: input.code, name: input.name },
    ...meta,
  });

  return row;
}

export async function updateTest(
  id: string,
  input: Partial<{
    code: string;
    name: string;
    categoryId: string | null;
    specimenType: string | null;
    unit: string | null;
    referenceRangeLow: number | null;
    referenceRangeHigh: number | null;
    referenceRangeText: string | null;
    active: boolean;
  }>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(labTests).where(eq(labTests.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab test");
  const existing = rows[0];

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.code !== undefined) updateData.code = input.code;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
  if (input.specimenType !== undefined) updateData.specimenType = input.specimenType;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.referenceRangeLow !== undefined)
    updateData.referenceRangeLow = input.referenceRangeLow != null ? String(input.referenceRangeLow) : null;
  if (input.referenceRangeHigh !== undefined)
    updateData.referenceRangeHigh = input.referenceRangeHigh != null ? String(input.referenceRangeHigh) : null;
  if (input.referenceRangeText !== undefined) updateData.referenceRangeText = input.referenceRangeText;
  if (input.active !== undefined) updateData.active = input.active;

  const [updated] = await db
    .update(labTests)
    .set(updateData)
    .where(eq(labTests.id, id))
    .returning();

  await logAudit({
    userId,
    action: "LAB_TEST_UPDATED",
    module: "laboratory",
    entity: "lab_test",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

// ─── Panels ──────────────────────────────────────────────────────

export async function listPanels() {
  const panels = await db.select().from(labPanels).orderBy(labPanels.name);
  const panelTests = await db
    .select({
      panelId: labPanelTests.panelId,
      testId: labPanelTests.testId,
      testCode: labTests.code,
      testName: labTests.name,
      testUnit: labTests.unit,
    })
    .from(labPanelTests)
    .innerJoin(labTests, eq(labPanelTests.testId, labTests.id));

  return panels.map((p) => ({
    ...p,
    tests: panelTests.filter((t) => t.panelId === p.id),
  }));
}

export async function createPanel(
  input: {
    code: string;
    name: string;
    description?: string | null;
    testIds: string[];
    active?: boolean;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const id = randomUUID();
    const [panel] = await tx
      .insert(labPanels)
      .values({
        id,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        active: input.active ?? true,
      })
      .returning();

    const testRows = input.testIds.map((testId) => ({
      id: randomUUID(),
      panelId: id,
      testId,
    }));
    await tx.insert(labPanelTests).values(testRows);

    return { panel, tests: testRows };
  });

  await logAudit({
    userId,
    action: "LAB_PANEL_CREATED",
    module: "laboratory",
    entity: "lab_panel",
    entityId: result.panel.id,
    newValues: { code: input.code, name: input.name, testIds: input.testIds },
    ...meta,
  });

  return result.panel;
}

export async function updatePanel(
  id: string,
  input: {
    code?: string;
    name?: string;
    description?: string | null;
    testIds?: string[];
    active?: boolean;
  },
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(labPanels).where(eq(labPanels.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab panel");
  const existing = rows[0];

  const updated = await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.active !== undefined) updateData.active = input.active;

    let panel = existing;
    if (Object.keys(updateData).length > 0) {
      const [u] = await tx
        .update(labPanels)
        .set(updateData)
        .where(eq(labPanels.id, id))
        .returning();
      panel = u;
    }

    if (input.testIds) {
      await tx.delete(labPanelTests).where(eq(labPanelTests.panelId, id));
      const testRows = input.testIds.map((testId) => ({
        id: randomUUID(),
        panelId: id,
        testId,
      }));
      if (testRows.length > 0) {
        await tx.insert(labPanelTests).values(testRows);
      }
    }

    return panel;
  });

  await logAudit({
    userId,
    action: "LAB_PANEL_UPDATED",
    module: "laboratory",
    entity: "lab_panel",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

// ─── Specimen Types ──────────────────────────────────────────────

export async function listSpecimenTypes() {
  return db.select().from(specimenTypes).orderBy(specimenTypes.name);
}

export async function createSpecimenType(
  input: { name: string; code: string; handlingNotes?: string | null },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(specimenTypes)
    .values({
      id,
      name: input.name,
      code: input.code,
      handlingNotes: input.handlingNotes ?? null,
    })
    .returning();

  await logAudit({
    userId,
    action: "SPECIMEN_TYPE_CREATED",
    module: "laboratory",
    entity: "specimen_type",
    entityId: id,
    newValues: { name: input.name, code: input.code },
    ...meta,
  });

  return row;
}

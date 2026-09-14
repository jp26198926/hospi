import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  clinicalOrders,
  labOrders,
  labOrderTests,
  labTests,
  labResults,
  specimens,
  specimenTypes,
  patients,
  queueEntries,
} from "@/db/schema";
import { eq, and, count, desc, sql, inArray } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import {
  OrderStatus,
  SpecimenStatus,
  LabResultStatus,
  QueueStatus,
} from "@/lib/types/enums";

function padSeq(n: number): string {
  return String(n).padStart(6, "0");
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextAccessionSequence(tx: Tx): Promise<number> {
  const maxResult = await tx
    .select({ maxNum: sql<number | null>`MAX(${specimens.sequenceNumber})` })
    .from(specimens);
  return (maxResult[0]?.maxNum ?? 0) + 1;
}

// ─── List / Detail ───────────────────────────────────────────────

export async function listLabOrders(opts: {
  status?: string;
  priority?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(clinicalOrders.type, "laboratory")];

  if (opts.status) conditions.push(eq(clinicalOrders.status, opts.status));
  if (opts.priority) conditions.push(eq(clinicalOrders.priority, opts.priority));

  const where = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: clinicalOrders.id,
        orderNumber: clinicalOrders.orderNumber,
        patientId: clinicalOrders.patientId,
        encounterId: clinicalOrders.encounterId,
        priority: clinicalOrders.priority,
        status: clinicalOrders.status,
        clinicalNotes: clinicalOrders.clinicalNotes,
        createdAt: clinicalOrders.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        labOrderId: labOrders.id,
        panelId: labOrders.panelId,
        notes: labOrders.notes,
      })
      .from(clinicalOrders)
      .innerJoin(labOrders, eq(labOrders.orderId, clinicalOrders.id))
      .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
      .where(where)
      .orderBy(desc(clinicalOrders.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(clinicalOrders)
      .innerJoin(labOrders, eq(labOrders.orderId, clinicalOrders.id))
      .where(where),
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

export async function getLabOrderDetail(id: string) {
  const rows = await db
    .select({
      id: clinicalOrders.id,
      orderNumber: clinicalOrders.orderNumber,
      patientId: clinicalOrders.patientId,
      encounterId: clinicalOrders.encounterId,
      priority: clinicalOrders.priority,
      status: clinicalOrders.status,
      clinicalNotes: clinicalOrders.clinicalNotes,
      createdAt: clinicalOrders.createdAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
      labOrderId: labOrders.id,
      panelId: labOrders.panelId,
      notes: labOrders.notes,
    })
    .from(clinicalOrders)
    .innerJoin(labOrders, eq(labOrders.orderId, clinicalOrders.id))
    .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
    .where(eq(clinicalOrders.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Lab order");
  const order = rows[0];

  const tests = await db
    .select({
      id: labOrderTests.id,
      testId: labOrderTests.testId,
      testCode: labTests.code,
      testName: labTests.name,
      testUnit: labTests.unit,
      referenceRangeLow: labTests.referenceRangeLow,
      referenceRangeHigh: labTests.referenceRangeHigh,
      referenceRangeText: labTests.referenceRangeText,
    })
    .from(labOrderTests)
    .innerJoin(labTests, eq(labOrderTests.testId, labTests.id))
    .where(eq(labOrderTests.labOrderId, order.labOrderId));

  const specimenRows = await db
    .select({
      id: specimens.id,
      accessionNumber: specimens.accessionNumber,
      specimenTypeId: specimens.specimenTypeId,
      collectedBy: specimens.collectedBy,
      collectedAt: specimens.collectedAt,
      status: specimens.status,
      notes: specimens.notes,
      rejectedReason: specimens.rejectedReason,
      createdAt: specimens.createdAt,
      typeName: specimenTypes.name,
    })
    .from(specimens)
    .leftJoin(specimenTypes, eq(specimens.specimenTypeId, specimenTypes.id))
    .where(eq(specimens.labOrderId, order.labOrderId))
    .orderBy(desc(specimens.createdAt));

  const resultRows = await db
    .select({
      id: labResults.id,
      specimenId: labResults.specimenId,
      testId: labResults.testId,
      value: labResults.value,
      unit: labResults.unit,
      referenceRangeLow: labResults.referenceRangeLow,
      referenceRangeHigh: labResults.referenceRangeHigh,
      referenceRangeText: labResults.referenceRangeText,
      isAbnormal: labResults.isAbnormal,
      abnormalFlag: labResults.abnormalFlag,
      status: labResults.status,
      amendmentOfId: labResults.amendmentOfId,
      amendmentReason: labResults.amendmentReason,
      enteredBy: labResults.enteredBy,
      enteredAt: labResults.enteredAt,
      validatedBy: labResults.validatedBy,
      validatedAt: labResults.validatedAt,
      releasedBy: labResults.releasedBy,
      releasedAt: labResults.releasedAt,
      testCode: labTests.code,
      testName: labTests.name,
    })
    .from(labResults)
    .innerJoin(labTests, eq(labResults.testId, labTests.id))
    .where(eq(labResults.labOrderId, order.labOrderId))
    .orderBy(desc(labResults.createdAt));

  return {
    ...order,
    tests: tests.map((t) => ({
      ...t,
      referenceRangeLow: t.referenceRangeLow != null ? Number(t.referenceRangeLow) : null,
      referenceRangeHigh: t.referenceRangeHigh != null ? Number(t.referenceRangeHigh) : null,
    })),
    specimens: specimenRows,
    results: resultRows.map((r) => ({
      ...r,
      referenceRangeLow: r.referenceRangeLow != null ? Number(r.referenceRangeLow) : null,
      referenceRangeHigh: r.referenceRangeHigh != null ? Number(r.referenceRangeHigh) : null,
    })),
  };
}

// ─── Specimen Collection ─────────────────────────────────────────

export async function collectSpecimen(
  input: { labOrderId: string; specimenTypeId?: string; notes?: string },
  userId: string,
  meta: RequestMeta
) {
  // labOrderId here is the clinical order id — resolve to lab_orders.id
  const labOrderRows = await db
    .select({ id: labOrders.id, orderId: labOrders.orderId })
    .from(labOrders)
    .where(eq(labOrders.orderId, input.labOrderId))
    .limit(1);
  if (!labOrderRows[0]) throw new NotFoundError("Lab order");

  const orderRows = await db
    .select()
    .from(clinicalOrders)
    .where(eq(clinicalOrders.id, input.labOrderId))
    .limit(1);
  if (!orderRows[0]) throw new NotFoundError("Order");
  const order = orderRows[0];

  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
    throw new ConflictError("Cannot collect specimen for a cancelled or rejected order");
  }

  const result = await db.transaction(async (tx) => {
    const seq = await nextAccessionSequence(tx);
    const accessionNumber = `ACC-${padSeq(seq)}`;
    const id = randomUUID();

    const [specimen] = await tx
      .insert(specimens)
      .values({
        id,
        labOrderId: labOrderRows[0].id,
        accessionNumber,
        sequenceNumber: seq,
        specimenTypeId: input.specimenTypeId ?? null,
        collectedBy: userId,
        collectedAt: new Date(),
        status: SpecimenStatus.COLLECTED,
        notes: input.notes ?? null,
      })
      .returning();

    await tx
      .update(clinicalOrders)
      .set({ status: OrderStatus.IN_PROGRESS, updatedAt: new Date() })
      .where(eq(clinicalOrders.id, input.labOrderId));

    return specimen;
  });

  await logAudit({
    userId,
    action: "SPECIMEN_COLLECTED",
    module: "laboratory",
    entity: "specimen",
    entityId: result.id,
    newValues: {
      accessionNumber: result.accessionNumber,
      labOrderId: input.labOrderId,
      specimenTypeId: input.specimenTypeId ?? null,
    },
    ...meta,
  });

  return result;
}

export async function markSpecimenProcessing(specimenId: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(specimens).where(eq(specimens.id, specimenId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Specimen");
  const existing = rows[0];

  if (existing.status !== SpecimenStatus.COLLECTED) {
    throw new ConflictError("Only collected specimens can be marked as processing");
  }

  const [updated] = await db
    .update(specimens)
    .set({ status: SpecimenStatus.IN_PROCESSING, updatedAt: new Date() })
    .where(eq(specimens.id, specimenId))
    .returning();

  await logAudit({
    userId,
    action: "SPECIMEN_PROCESSING",
    module: "laboratory",
    entity: "specimen",
    entityId: specimenId,
    oldValues: { status: existing.status },
    newValues: { status: SpecimenStatus.IN_PROCESSING },
    ...meta,
  });

  return updated;
}

export async function rejectSpecimen(specimenId: string, reason: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(specimens).where(eq(specimens.id, specimenId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Specimen");
  const existing = rows[0];

  if (existing.status === SpecimenStatus.REJECTED || existing.status === SpecimenStatus.COMPLETED) {
    throw new ConflictError("Cannot reject a completed or already rejected specimen");
  }

  const [updated] = await db
    .update(specimens)
    .set({
      status: SpecimenStatus.REJECTED,
      rejectedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(specimens.id, specimenId))
    .returning();

  await logAudit({
    userId,
    action: "SPECIMEN_REJECTED",
    module: "laboratory",
    entity: "specimen",
    entityId: specimenId,
    oldValues: { status: existing.status },
    newValues: { status: SpecimenStatus.REJECTED, reason },
    ...meta,
  });

  return updated;
}

// ─── Results ─────────────────────────────────────────────────────

function computeAbnormal(
  value: string,
  low: string | null,
  high: string | null
): { isAbnormal: boolean; flag: string | null } {
  const num = Number(value);
  if (Number.isNaN(num) || (low == null && high == null)) {
    return { isAbnormal: false, flag: null };
  }
  const lowNum = low != null ? Number(low) : null;
  const highNum = high != null ? Number(high) : null;

  if (lowNum != null && num < lowNum) return { isAbnormal: true, flag: "L" };
  if (highNum != null && num > highNum) return { isAbnormal: true, flag: "H" };
  return { isAbnormal: false, flag: null };
}

export async function enterResults(
  input: {
    labOrderId: string;
    specimenId?: string;
    results: Array<{
      testId: string;
      value: string;
      unit?: string;
      isAbnormal?: boolean;
      abnormalFlag?: string;
    }>;
  },
  userId: string,
  meta: RequestMeta
) {
  const labOrderRows = await db
    .select({ id: labOrders.id })
    .from(labOrders)
    .where(eq(labOrders.orderId, input.labOrderId))
    .limit(1);
  if (!labOrderRows[0]) throw new NotFoundError("Lab order");
  const labOrderId = labOrderRows[0].id;

  // Fetch test reference ranges
  const testIds = input.results.map((r) => r.testId);
  const testRows = await db
    .select()
    .from(labTests)
    .where(inArray(labTests.id, testIds));
  const testMap = new Map(testRows.map((t) => [t.id, t]));

  const created = await db.transaction(async (tx) => {
    const rows = input.results.map((r) => {
      const test = testMap.get(r.testId);
      if (!test) throw new ValidationError(`Test not found: ${r.testId}`);

      const low = test.referenceRangeLow;
      const high = test.referenceRangeHigh;
      const computed = computeAbnormal(r.value, low, high);

      return {
        id: randomUUID(),
        labOrderId,
        specimenId: input.specimenId ?? null,
        testId: r.testId,
        value: r.value,
        unit: r.unit ?? test.unit,
        referenceRangeLow: low,
        referenceRangeHigh: high,
        referenceRangeText: test.referenceRangeText,
        isAbnormal: r.isAbnormal ?? computed.isAbnormal,
        abnormalFlag: r.abnormalFlag ?? computed.flag,
        status: LabResultStatus.ENTERED,
        enteredBy: userId,
      };
    });

    const inserted = await tx.insert(labResults).values(rows).returning();

    // Ensure order is in_progress
    await tx
      .update(clinicalOrders)
      .set({ status: OrderStatus.IN_PROGRESS, updatedAt: new Date() })
      .where(eq(clinicalOrders.id, input.labOrderId));

    return inserted;
  });

  await logAudit({
    userId,
    action: "LAB_RESULTS_ENTERED",
    module: "laboratory",
    entity: "lab_result",
    entityId: created[0]?.id,
    newValues: {
      labOrderId: input.labOrderId,
      count: created.length,
      testIds,
    },
    ...meta,
  });

  return created;
}

export async function validateResult(resultId: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(labResults).where(eq(labResults.id, resultId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab result");
  const existing = rows[0];

  if (existing.status !== LabResultStatus.ENTERED) {
    throw new ConflictError("Only entered results can be validated");
  }

  const [updated] = await db
    .update(labResults)
    .set({
      status: LabResultStatus.VALIDATED,
      validatedBy: userId,
      validatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(labResults.id, resultId))
    .returning();

  await logAudit({
    userId,
    action: "LAB_RESULT_VALIDATED",
    module: "laboratory",
    entity: "lab_result",
    entityId: resultId,
    oldValues: { status: existing.status },
    newValues: { status: LabResultStatus.VALIDATED },
    ...meta,
  });

  return updated;
}

export async function releaseResult(resultId: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(labResults).where(eq(labResults.id, resultId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab result");
  const existing = rows[0];

  if (existing.status !== LabResultStatus.VALIDATED) {
    throw new ConflictError("Only validated results can be released");
  }

  const outcome = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(labResults)
      .set({
        status: LabResultStatus.RELEASED,
        releasedBy: userId,
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(labResults.id, resultId))
      .returning();

    // Check if all results for this lab order are released
    const remaining = await tx
      .select({ value: count() })
      .from(labResults)
      .where(
        and(
          eq(labResults.labOrderId, existing.labOrderId),
          inArray(labResults.status, [
            LabResultStatus.ENTERED,
            LabResultStatus.VALIDATED,
          ])
        )
      );

    const remainingCount = remaining[0]?.value ?? 0;
    let orderCompleted = false;

    if (remainingCount === 0) {
      // Complete the clinical order
      const labOrderRows = await tx
        .select({ orderId: labOrders.orderId })
        .from(labOrders)
        .where(eq(labOrders.id, existing.labOrderId))
        .limit(1);

      if (labOrderRows[0]) {
        await tx
          .update(clinicalOrders)
          .set({ status: OrderStatus.COMPLETED, updatedAt: new Date() })
          .where(eq(clinicalOrders.id, labOrderRows[0].orderId));

        // Complete specimens
        await tx
          .update(specimens)
          .set({ status: SpecimenStatus.COMPLETED, updatedAt: new Date() })
          .where(
            and(
              eq(specimens.labOrderId, existing.labOrderId),
              inArray(specimens.status, [SpecimenStatus.COLLECTED, SpecimenStatus.IN_PROCESSING])
            )
          );

        // Complete laboratory queue entries for this encounter
        const orderRows = await tx
          .select({ encounterId: clinicalOrders.encounterId })
          .from(clinicalOrders)
          .where(eq(clinicalOrders.id, labOrderRows[0].orderId))
          .limit(1);

        if (orderRows[0]) {
          await tx
            .update(queueEntries)
            .set({ status: QueueStatus.COMPLETED, completedTime: new Date(), updatedAt: new Date() })
            .where(
              and(
                eq(queueEntries.queueType, "laboratory"),
                eq(queueEntries.encounterId, orderRows[0].encounterId),
                inArray(queueEntries.status, [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS])
              )
            );
        }

        orderCompleted = true;
      }
    }

    return { updated, orderCompleted };
  });

  await logAudit({
    userId,
    action: "LAB_RESULT_RELEASED",
    module: "laboratory",
    entity: "lab_result",
    entityId: resultId,
    oldValues: { status: existing.status },
    newValues: {
      status: LabResultStatus.RELEASED,
      orderCompleted: outcome.orderCompleted,
    },
    ...meta,
  });

  return outcome.updated;
}

export async function amendResult(
  resultId: string,
  input: { value: string; unit?: string; reason: string },
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(labResults).where(eq(labResults.id, resultId)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab result");
  const existing = rows[0];

  if (existing.status !== LabResultStatus.RELEASED) {
    throw new ConflictError("Only released results can be amended");
  }

  const testRows = await db
    .select()
    .from(labTests)
    .where(eq(labTests.id, existing.testId))
    .limit(1);
  const test = testRows[0];

  const outcome = await db.transaction(async (tx) => {
    const low = test?.referenceRangeLow ?? null;
    const high = test?.referenceRangeHigh ?? null;
    const computed = computeAbnormal(input.value, low, high);

    const newId = randomUUID();
    const [amended] = await tx
      .insert(labResults)
      .values({
        id: newId,
        labOrderId: existing.labOrderId,
        specimenId: existing.specimenId,
        testId: existing.testId,
        value: input.value,
        unit: input.unit ?? existing.unit,
        referenceRangeLow: low,
        referenceRangeHigh: high,
        referenceRangeText: test?.referenceRangeText ?? null,
        isAbnormal: computed.isAbnormal,
        abnormalFlag: computed.flag,
        status: LabResultStatus.ENTERED,
        amendmentOfId: resultId,
        amendmentReason: input.reason,
        enteredBy: userId,
      })
      .returning();

    // Mark original as amended
    await tx
      .update(labResults)
      .set({ status: LabResultStatus.AMENDED, updatedAt: new Date() })
      .where(eq(labResults.id, resultId));

    // Put order back to in_progress
    await tx
      .update(clinicalOrders)
      .set({ status: OrderStatus.IN_PROGRESS, updatedAt: new Date() })
      .where(eq(clinicalOrders.id, existing.labOrderId));

    return amended;
  });

  await logAudit({
    userId,
    action: "LAB_RESULT_AMENDED",
    module: "laboratory",
    entity: "lab_result",
    entityId: outcome.id,
    oldValues: { originalId: resultId, originalValue: existing.value },
    newValues: { value: input.value, reason: input.reason },
    ...meta,
  });

  return outcome;
}

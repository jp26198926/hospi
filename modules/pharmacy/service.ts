import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  clinicalOrders,
  prescriptions,
  prescriptionItems,
  dispensings,
  dispensingItems,
  medications,
  medicationBatches,
  stockMovements,
  patients,
  queueEntries,
} from "@/db/schema";
import { eq, and, count, desc, sql, gt, inArray } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import {
  OrderType,
  OrderStatus,
  PrescriptionStatus,
  DispensingStatus,
  StockMovementType,
  QueueType,
  QueueStatus,
} from "@/lib/types/enums";

function padSeq(n: number): string {
  return String(n).padStart(6, "0");
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextOrderSequence(tx: Tx, type: string): Promise<number> {
  const maxResult = await tx
    .select({ maxNum: sql<number | null>`MAX(${clinicalOrders.sequenceNumber})` })
    .from(clinicalOrders)
    .where(eq(clinicalOrders.type, type));
  return (maxResult[0]?.maxNum ?? 0) + 1;
}

// ─── FEFO helper ─────────────────────────────────────────────────

interface FefoPick {
  batchId: string;
  quantity: number;
  unitPrice: number;
}

async function fefoPick(
  tx: Tx,
  medicationId: string,
  neededQty: number,
  overridePrice?: number
): Promise<FefoPick[]> {
  const today = new Date().toISOString().split("T")[0];

  const batches = await tx
    .select()
    .from(medicationBatches)
    .where(
      and(
        eq(medicationBatches.medicationId, medicationId),
        gt(medicationBatches.expirationDate, today),
        gt(medicationBatches.quantity, 0)
      )
    )
    .orderBy(medicationBatches.expirationDate);

  const medRows = await tx
    .select({ sellingPrice: medications.sellingPrice })
    .from(medications)
    .where(eq(medications.id, medicationId))
    .limit(1);
  const defaultPrice = Number(medRows[0]?.sellingPrice ?? 0);

  const picks: FefoPick[] = [];
  let remaining = neededQty;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    picks.push({
      batchId: batch.id,
      quantity: take,
      unitPrice: overridePrice ?? defaultPrice,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new ValidationError(
      `Insufficient stock for medication ${medicationId}. Needed ${neededQty}, available ${neededQty - remaining}`
    );
  }

  return picks;
}

// ─── Prescriptions ───────────────────────────────────────────────

export async function listPrescriptions(opts: {
  status?: string;
  patientId?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.status) conditions.push(eq(prescriptions.status, opts.status));
  if (opts.patientId) conditions.push(eq(prescriptions.patientId, opts.patientId));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: prescriptions.id,
        orderId: prescriptions.orderId,
        patientId: prescriptions.patientId,
        encounterId: prescriptions.encounterId,
        prescriberId: prescriptions.prescriberId,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        orderNumber: clinicalOrders.orderNumber,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(prescriptions)
      .leftJoin(clinicalOrders, eq(prescriptions.orderId, clinicalOrders.id))
      .leftJoin(patients, eq(prescriptions.patientId, patients.id))
      .where(where)
      .orderBy(desc(prescriptions.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(prescriptions).where(where),
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

export async function getPrescriptionDetail(id: string) {
  const rows = await db
    .select({
      id: prescriptions.id,
      orderId: prescriptions.orderId,
      patientId: prescriptions.patientId,
      encounterId: prescriptions.encounterId,
      prescriberId: prescriptions.prescriberId,
      status: prescriptions.status,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      createdBy: prescriptions.createdBy,
      updatedAt: prescriptions.updatedAt,
      orderNumber: clinicalOrders.orderNumber,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
    })
    .from(prescriptions)
    .leftJoin(clinicalOrders, eq(prescriptions.orderId, clinicalOrders.id))
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Prescription");

  const items = await db
    .select({
      id: prescriptionItems.id,
      medicationId: prescriptionItems.medicationId,
      dose: prescriptionItems.dose,
      route: prescriptionItems.route,
      frequency: prescriptionItems.frequency,
      durationDays: prescriptionItems.durationDays,
      quantity: prescriptionItems.quantity,
      instructions: prescriptionItems.instructions,
      genericName: medications.genericName,
      brandName: medications.brandName,
      dosageForm: medications.dosageForm,
      strength: medications.strength,
      unit: medications.unit,
      sellingPrice: medications.sellingPrice,
    })
    .from(prescriptionItems)
    .innerJoin(medications, eq(prescriptionItems.medicationId, medications.id))
    .where(eq(prescriptionItems.prescriptionId, id));

  return {
    ...rows[0],
    items: items.map((i) => ({ ...i, sellingPrice: Number(i.sellingPrice) })),
  };
}

export async function createPrescription(
  input: {
    patientId: string;
    encounterId: string;
    prescriberId: string;
    consultationId?: string | null;
    departmentId?: string | null;
    priority?: string;
    clinicalNotes?: string | null;
    notes?: string | null;
    items: Array<{
      medicationId: string;
      dose: string;
      route: string;
      frequency: string;
      durationDays?: number | null;
      quantity: number;
      instructions?: string | null;
    }>;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const seq = await nextOrderSequence(tx, OrderType.MEDICATION);
    const orderId = randomUUID();
    const orderNumber = `MED-${padSeq(seq)}`;

    const [order] = await tx
      .insert(clinicalOrders)
      .values({
        id: orderId,
        orderNumber,
        type: OrderType.MEDICATION,
        sequenceNumber: seq,
        patientId: input.patientId,
        encounterId: input.encounterId,
        consultationId: input.consultationId ?? null,
        orderingProviderId: input.prescriberId,
        departmentId: input.departmentId ?? null,
        priority: input.priority ?? "normal",
        status: OrderStatus.ORDERED,
        clinicalNotes: input.clinicalNotes ?? null,
        createdBy: userId,
      })
      .returning();

    const rxId = randomUUID();
    const [rx] = await tx
      .insert(prescriptions)
      .values({
        id: rxId,
        orderId,
        patientId: input.patientId,
        encounterId: input.encounterId,
        prescriberId: input.prescriberId,
        status: PrescriptionStatus.PENDING,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    const itemRows = input.items.map((item) => ({
      id: randomUUID(),
      prescriptionId: rxId,
      medicationId: item.medicationId,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      durationDays: item.durationDays ?? null,
      quantity: item.quantity,
      instructions: item.instructions ?? null,
    }));
    await tx.insert(prescriptionItems).values(itemRows);

    return { order, rx, items: itemRows };
  });

  await logAudit({
    userId,
    action: "PRESCRIPTION_CREATED",
    module: "pharmacy",
    entity: "prescription",
    entityId: result.rx.id,
    newValues: {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      patientId: input.patientId,
      itemCount: input.items.length,
    },
    ...meta,
  });

  return { ...result.rx, items: result.items, orderNumber: result.order.orderNumber };
}

export async function cancelPrescription(
  id: string,
  reason: string,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Prescription");
  const existing = rows[0];

  if (existing.status !== PrescriptionStatus.PENDING) {
    throw new ConflictError("Only pending prescriptions can be cancelled");
  }

  const outcome = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(prescriptions)
      .set({
        status: PrescriptionStatus.CANCELLED,
        notes: existing.notes ? `${existing.notes}\n[CANCELLED] ${reason}` : `[CANCELLED] ${reason}`,
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();

    // Also cancel the clinical order
    await tx
      .update(clinicalOrders)
      .set({
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      })
      .where(eq(clinicalOrders.id, existing.orderId));

    return updated;
  });

  await logAudit({
    userId,
    action: "PRESCRIPTION_CANCELLED",
    module: "pharmacy",
    entity: "prescription",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: PrescriptionStatus.CANCELLED, reason },
    ...meta,
  });

  return outcome;
}

// ─── Dispensing ──────────────────────────────────────────────────

export async function dispensePrescription(
  input: { prescriptionId: string; notes?: string | null },
  userId: string,
  meta: RequestMeta
) {
  const rxRows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, input.prescriptionId))
    .limit(1);
  if (!rxRows[0]) throw new NotFoundError("Prescription");
  const rx = rxRows[0];

  if (rx.status !== PrescriptionStatus.PENDING) {
    throw new ConflictError("Only pending prescriptions can be dispensed");
  }

  const rxItems = await db
    .select()
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, input.prescriptionId));

  if (rxItems.length === 0) {
    throw new ValidationError("Prescription has no items");
  }

  const result = await db.transaction(async (tx) => {
    // FEFO pick for each item
    const allPicks: Array<{
      medicationId: string;
      batchId: string;
      quantity: number;
      unitPrice: number;
      prescriptionItemId: string;
    }> = [];

    for (const item of rxItems) {
      const picks = await fefoPick(tx, item.medicationId, item.quantity);
      for (const pick of picks) {
        allPicks.push({
          medicationId: item.medicationId,
          batchId: pick.batchId,
          quantity: pick.quantity,
          unitPrice: pick.unitPrice,
          prescriptionItemId: item.id,
        });
      }
    }

    // Create dispensing
    const dispensingId = randomUUID();
    const totalAmount = allPicks.reduce(
      (sum, p) => sum + p.quantity * p.unitPrice,
      0
    );

    const [dispensing] = await tx
      .insert(dispensings)
      .values({
        id: dispensingId,
        prescriptionId: input.prescriptionId,
        patientId: rx.patientId,
        encounterId: rx.encounterId,
        pharmacistId: userId,
        status: DispensingStatus.COMPLETED,
        dispensedAt: new Date(),
        totalAmount: String(totalAmount),
        notes: input.notes ?? null,
      })
      .returning();

    // Create dispensing items and decrement batches + OUT movements
    for (const pick of allPicks) {
      const totalPrice = pick.quantity * pick.unitPrice;
      await tx.insert(dispensingItems).values({
        id: randomUUID(),
        dispensingId,
        medicationId: pick.medicationId,
        batchId: pick.batchId,
        quantity: pick.quantity,
        unitPrice: String(pick.unitPrice),
        totalPrice: String(totalPrice),
        prescriptionItemId: pick.prescriptionItemId,
      });

      // Decrement batch
      const batchRows = await tx
        .select()
        .from(medicationBatches)
        .where(eq(medicationBatches.id, pick.batchId))
        .limit(1);
      const newQty = (batchRows[0]?.quantity ?? 0) - pick.quantity;

      await tx
        .update(medicationBatches)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(medicationBatches.id, pick.batchId));

      await tx.insert(stockMovements).values({
        id: randomUUID(),
        medicationId: pick.medicationId,
        batchId: pick.batchId,
        type: StockMovementType.OUT,
        quantity: -pick.quantity,
        quantityAfter: newQty,
        referenceType: "dispensing",
        referenceId: dispensingId,
        performedBy: userId,
        notes: `Dispensed for prescription ${input.prescriptionId}`,
      });
    }

    // Mark prescription as dispensed
    await tx
      .update(prescriptions)
      .set({ status: PrescriptionStatus.DISPENSED, updatedAt: new Date() })
      .where(eq(prescriptions.id, input.prescriptionId));

    // Complete the clinical order
    await tx
      .update(clinicalOrders)
      .set({ status: OrderStatus.COMPLETED, updatedAt: new Date() })
      .where(eq(clinicalOrders.id, rx.orderId));

    // Complete pharmacy queue entries for this encounter
    await tx
      .update(queueEntries)
      .set({
        status: QueueStatus.COMPLETED,
        completedTime: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(queueEntries.queueType, QueueType.PHARMACY),
          eq(queueEntries.encounterId, rx.encounterId),
          inArray(queueEntries.status, [
            QueueStatus.WAITING,
            QueueStatus.CALLED,
            QueueStatus.IN_PROGRESS,
          ])
        )
      );

    return { dispensing, totalAmount };
  });

  await logAudit({
    userId,
    action: "PRESCRIPTION_DISPENSED",
    module: "pharmacy",
    entity: "dispensing",
    entityId: result.dispensing.id,
    newValues: {
      prescriptionId: input.prescriptionId,
      totalAmount: result.totalAmount,
      itemCount: allPicksCount(rxItems),
    },
    ...meta,
  });

  return result.dispensing;
}

function allPicksCount(rxItems: Array<{ quantity: number }>): number {
  return rxItems.reduce((sum, i) => sum + i.quantity, 0);
}

export async function createWalkInSale(
  input: {
    patientId?: string | null;
    encounterId?: string | null;
    notes?: string | null;
    items: Array<{
      medicationId: string;
      quantity: number;
      unitPrice?: number;
    }>;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const allPicks: Array<{
      medicationId: string;
      batchId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of input.items) {
      const picks = await fefoPick(tx, item.medicationId, item.quantity, item.unitPrice);
      for (const pick of picks) {
        allPicks.push({
          medicationId: item.medicationId,
          batchId: pick.batchId,
          quantity: pick.quantity,
          unitPrice: pick.unitPrice,
        });
      }
    }

    const dispensingId = randomUUID();
    const totalAmount = allPicks.reduce(
      (sum, p) => sum + p.quantity * p.unitPrice,
      0
    );

    const [dispensing] = await tx
      .insert(dispensings)
      .values({
        id: dispensingId,
        prescriptionId: null,
        patientId: input.patientId ?? null,
        encounterId: input.encounterId ?? null,
        pharmacistId: userId,
        status: DispensingStatus.COMPLETED,
        dispensedAt: new Date(),
        totalAmount: String(totalAmount),
        notes: input.notes ?? "Walk-in sale",
      })
      .returning();

    for (const pick of allPicks) {
      const totalPrice = pick.quantity * pick.unitPrice;
      await tx.insert(dispensingItems).values({
        id: randomUUID(),
        dispensingId,
        medicationId: pick.medicationId,
        batchId: pick.batchId,
        quantity: pick.quantity,
        unitPrice: String(pick.unitPrice),
        totalPrice: String(totalPrice),
        prescriptionItemId: null,
      });

      const batchRows = await tx
        .select()
        .from(medicationBatches)
        .where(eq(medicationBatches.id, pick.batchId))
        .limit(1);
      const newQty = (batchRows[0]?.quantity ?? 0) - pick.quantity;

      await tx
        .update(medicationBatches)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(medicationBatches.id, pick.batchId));

      await tx.insert(stockMovements).values({
        id: randomUUID(),
        medicationId: pick.medicationId,
        batchId: pick.batchId,
        type: StockMovementType.OUT,
        quantity: -pick.quantity,
        quantityAfter: newQty,
        referenceType: "walk_in_sale",
        referenceId: dispensingId,
        performedBy: userId,
        notes: input.notes ?? "Walk-in sale",
      });
    }

    return { dispensing, totalAmount };
  });

  await logAudit({
    userId,
    action: "WALK_IN_SALE",
    module: "pharmacy",
    entity: "dispensing",
    entityId: result.dispensing.id,
    newValues: {
      totalAmount: result.totalAmount,
      patientId: input.patientId ?? null,
      itemCount: input.items.length,
    },
    ...meta,
  });

  return result.dispensing;
}

export async function listDispensings(opts: {
  status?: string;
  patientId?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.status) conditions.push(eq(dispensings.status, opts.status));
  if (opts.patientId) conditions.push(eq(dispensings.patientId, opts.patientId));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: dispensings.id,
        prescriptionId: dispensings.prescriptionId,
        patientId: dispensings.patientId,
        encounterId: dispensings.encounterId,
        pharmacistId: dispensings.pharmacistId,
        status: dispensings.status,
        dispensedAt: dispensings.dispensedAt,
        totalAmount: dispensings.totalAmount,
        notes: dispensings.notes,
        createdAt: dispensings.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(dispensings)
      .leftJoin(patients, eq(dispensings.patientId, patients.id))
      .where(where)
      .orderBy(desc(dispensings.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(dispensings).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items: items.map((d) => ({
      ...d,
      totalAmount: Number(d.totalAmount),
    })),
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function getDispensingDetail(id: string) {
  const rows = await db
    .select({
      id: dispensings.id,
      prescriptionId: dispensings.prescriptionId,
      patientId: dispensings.patientId,
      encounterId: dispensings.encounterId,
      pharmacistId: dispensings.pharmacistId,
      status: dispensings.status,
      dispensedAt: dispensings.dispensedAt,
      totalAmount: dispensings.totalAmount,
      notes: dispensings.notes,
      createdAt: dispensings.createdAt,
      updatedAt: dispensings.updatedAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
    })
    .from(dispensings)
    .leftJoin(patients, eq(dispensings.patientId, patients.id))
    .where(eq(dispensings.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Dispensing");

  const items = await db
    .select({
      id: dispensingItems.id,
      medicationId: dispensingItems.medicationId,
      batchId: dispensingItems.batchId,
      quantity: dispensingItems.quantity,
      unitPrice: dispensingItems.unitPrice,
      totalPrice: dispensingItems.totalPrice,
      prescriptionItemId: dispensingItems.prescriptionItemId,
      genericName: medications.genericName,
      brandName: medications.brandName,
      dosageForm: medications.dosageForm,
      strength: medications.strength,
      batchNumber: medicationBatches.batchNumber,
      expirationDate: medicationBatches.expirationDate,
    })
    .from(dispensingItems)
    .innerJoin(medications, eq(dispensingItems.medicationId, medications.id))
    .leftJoin(medicationBatches, eq(dispensingItems.batchId, medicationBatches.id))
    .where(eq(dispensingItems.dispensingId, id));

  return {
    ...rows[0],
    totalAmount: Number(rows[0].totalAmount),
    items: items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  };
}

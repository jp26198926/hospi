import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { medications, medicationBatches, stockMovements, suppliers } from "@/db/schema";
import { eq, and, count, desc, sql, lte } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { StockMovementType } from "@/lib/types/enums";

// ─── Suppliers ───────────────────────────────────────────────────

export async function listSuppliers() {
  return db.select().from(suppliers).where(eq(suppliers.active, true)).orderBy(suppliers.name);
}

export async function createSupplier(
  input: {
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const id = randomUUID();
  const [row] = await db
    .insert(suppliers)
    .values({
      id,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
    })
    .returning();

  await logAudit({
    userId,
    action: "SUPPLIER_CREATED",
    module: "inventory",
    entity: "supplier",
    entityId: id,
    newValues: { name: input.name },
    ...meta,
  });

  return row;
}

// ─── Batches ─────────────────────────────────────────────────────

export async function listBatches(opts: {
  medicationId?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.medicationId) conditions.push(eq(medicationBatches.medicationId, opts.medicationId));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: medicationBatches.id,
        medicationId: medicationBatches.medicationId,
        batchNumber: medicationBatches.batchNumber,
        expirationDate: medicationBatches.expirationDate,
        quantity: medicationBatches.quantity,
        supplierId: medicationBatches.supplierId,
        receivedDate: medicationBatches.receivedDate,
        createdAt: medicationBatches.createdAt,
        genericName: medications.genericName,
        brandName: medications.brandName,
        dosageForm: medications.dosageForm,
        strength: medications.strength,
      })
      .from(medicationBatches)
      .innerJoin(medications, eq(medicationBatches.medicationId, medications.id))
      .where(where)
      .orderBy(medicationBatches.expirationDate)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(medicationBatches).where(where),
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

// ─── Stock Operations ────────────────────────────────────────────

export async function receiveBatch(
  input: {
    medicationId: string;
    batchNumber: string;
    expirationDate: string;
    quantity: number;
    supplierId?: string | null;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    // Check if batch already exists for this medication
    const existingBatches = await tx
      .select()
      .from(medicationBatches)
      .where(
        and(
          eq(medicationBatches.medicationId, input.medicationId),
          eq(medicationBatches.batchNumber, input.batchNumber)
        )
      )
      .limit(1);

    let batch;
    if (existingBatches[0]) {
      // Increment existing batch
      const newQty = existingBatches[0].quantity + input.quantity;
      const [updated] = await tx
        .update(medicationBatches)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(medicationBatches.id, existingBatches[0].id))
        .returning();
      batch = updated;
    } else {
      const id = randomUUID();
      const [created] = await tx
        .insert(medicationBatches)
        .values({
          id,
          medicationId: input.medicationId,
          batchNumber: input.batchNumber,
          expirationDate: input.expirationDate,
          quantity: input.quantity,
          supplierId: input.supplierId ?? null,
        })
        .returning();
      batch = created;
    }

    await tx.insert(stockMovements).values({
      id: randomUUID(),
      medicationId: input.medicationId,
      batchId: batch.id,
      type: StockMovementType.IN,
      quantity: input.quantity,
      quantityAfter: batch.quantity,
      referenceType: "receiving",
      performedBy: userId,
      notes: input.notes ?? null,
    });

    return batch;
  });

  await logAudit({
    userId,
    action: "STOCK_RECEIVED",
    module: "inventory",
    entity: "medication_batch",
    entityId: result.id,
    newValues: {
      medicationId: input.medicationId,
      batchNumber: input.batchNumber,
      quantity: input.quantity,
      expirationDate: input.expirationDate,
    },
    ...meta,
  });

  return result;
}

export async function adjustStock(
  input: { batchId: string; quantityChange: number; reason: string },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(medicationBatches)
      .where(eq(medicationBatches.id, input.batchId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError("Medication batch");
    const batch = rows[0];

    const newQty = batch.quantity + input.quantityChange;
    if (newQty < 0) {
      throw new ValidationError("Adjustment would result in negative stock");
    }

    const [updated] = await tx
      .update(medicationBatches)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(medicationBatches.id, input.batchId))
      .returning();

    await tx.insert(stockMovements).values({
      id: randomUUID(),
      medicationId: batch.medicationId,
      batchId: batch.id,
      type: StockMovementType.ADJUSTMENT,
      quantity: input.quantityChange,
      quantityAfter: newQty,
      referenceType: "adjustment",
      performedBy: userId,
      notes: input.reason,
    });

    return updated;
  });

  await logAudit({
    userId,
    action: "STOCK_ADJUSTED",
    module: "inventory",
    entity: "medication_batch",
    entityId: input.batchId,
    newValues: {
      quantityChange: input.quantityChange,
      reason: input.reason,
    },
    ...meta,
  });

  return result;
}

export async function transferStock(
  input: { batchId: string; quantity: number; destination: string; notes?: string | null },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(medicationBatches)
      .where(eq(medicationBatches.id, input.batchId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError("Medication batch");
    const batch = rows[0];

    if (batch.quantity < input.quantity) {
      throw new ValidationError("Insufficient stock for transfer");
    }

    const newQty = batch.quantity - input.quantity;
    const [updated] = await tx
      .update(medicationBatches)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(medicationBatches.id, input.batchId))
      .returning();

    await tx.insert(stockMovements).values({
      id: randomUUID(),
      medicationId: batch.medicationId,
      batchId: batch.id,
      type: StockMovementType.TRANSFER,
      quantity: -input.quantity,
      quantityAfter: newQty,
      referenceType: "transfer",
      referenceId: input.destination,
      performedBy: userId,
      notes: input.notes ?? `Transferred to ${input.destination}`,
    });

    return updated;
  });

  await logAudit({
    userId,
    action: "STOCK_TRANSFERRED",
    module: "inventory",
    entity: "medication_batch",
    entityId: input.batchId,
    newValues: {
      quantity: input.quantity,
      destination: input.destination,
    },
    ...meta,
  });

  return result;
}

export async function markExpired(
  input: { batchId: string; quantity?: number },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(medicationBatches)
      .where(eq(medicationBatches.id, input.batchId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError("Medication batch");
    const batch = rows[0];

    const expireQty = input.quantity ?? batch.quantity;
    if (expireQty > batch.quantity) {
      throw new ValidationError("Cannot expire more than available stock");
    }

    const newQty = batch.quantity - expireQty;
    const [updated] = await tx
      .update(medicationBatches)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(medicationBatches.id, input.batchId))
      .returning();

    await tx.insert(stockMovements).values({
      id: randomUUID(),
      medicationId: batch.medicationId,
      batchId: batch.id,
      type: StockMovementType.EXPIRED,
      quantity: -expireQty,
      quantityAfter: newQty,
      referenceType: "expiration",
      performedBy: userId,
      notes: `Marked expired: ${expireQty} units`,
    });

    return updated;
  });

  await logAudit({
    userId,
    action: "STOCK_MARKED_EXPIRED",
    module: "inventory",
    entity: "medication_batch",
    entityId: input.batchId,
    newValues: { quantity: input.quantity ?? null },
    ...meta,
  });

  return result;
}

export async function returnStock(
  input: {
    batchId: string;
    quantity: number;
    reason: string;
    dispensingId?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(medicationBatches)
      .where(eq(medicationBatches.id, input.batchId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError("Medication batch");
    const batch = rows[0];

    const newQty = batch.quantity + input.quantity;
    const [updated] = await tx
      .update(medicationBatches)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(medicationBatches.id, input.batchId))
      .returning();

    await tx.insert(stockMovements).values({
      id: randomUUID(),
      medicationId: batch.medicationId,
      batchId: batch.id,
      type: StockMovementType.RETURN,
      quantity: input.quantity,
      quantityAfter: newQty,
      referenceType: input.dispensingId ? "dispensing" : "return",
      referenceId: input.dispensingId ?? null,
      performedBy: userId,
      notes: input.reason,
    });

    return updated;
  });

  await logAudit({
    userId,
    action: "STOCK_RETURNED",
    module: "inventory",
    entity: "medication_batch",
    entityId: input.batchId,
    newValues: {
      quantity: input.quantity,
      reason: input.reason,
      dispensingId: input.dispensingId ?? null,
    },
    ...meta,
  });

  return result;
}

export async function listStockMovements(opts: {
  medicationId?: string;
  batchId?: string;
  type?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.medicationId) conditions.push(eq(stockMovements.medicationId, opts.medicationId));
  if (opts.batchId) conditions.push(eq(stockMovements.batchId, opts.batchId));
  if (opts.type) conditions.push(eq(stockMovements.type, opts.type));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        medicationId: stockMovements.medicationId,
        batchId: stockMovements.batchId,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        quantityAfter: stockMovements.quantityAfter,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        performedBy: stockMovements.performedBy,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        batchNumber: medicationBatches.batchNumber,
        genericName: medications.genericName,
      })
      .from(stockMovements)
      .leftJoin(medicationBatches, eq(stockMovements.batchId, medicationBatches.id))
      .leftJoin(medications, eq(stockMovements.medicationId, medications.id))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(stockMovements).where(where),
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

export async function listReorderAlerts() {
  // Find medications where total on-hand <= reorderLevel
  const allMeds = await db
    .select({
      id: medications.id,
      genericName: medications.genericName,
      brandName: medications.brandName,
      dosageForm: medications.dosageForm,
      strength: medications.strength,
      unit: medications.unit,
      reorderLevel: medications.reorderLevel,
    })
    .from(medications)
    .where(eq(medications.active, true));

  const alerts = [];
  for (const med of allMeds) {
    const batchResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${medicationBatches.quantity}), 0)` })
      .from(medicationBatches)
      .where(eq(medicationBatches.medicationId, med.id));

    const totalOnHand = Number(batchResult[0]?.total ?? 0);
    if (totalOnHand <= med.reorderLevel) {
      alerts.push({
        ...med,
        totalOnHand,
        shortfall: med.reorderLevel - totalOnHand,
      });
    }
  }

  return alerts;
}

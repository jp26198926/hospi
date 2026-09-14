import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  clinicalOrders,
  labOrders,
  labOrderTests,
  radiologyOrders,
  prescriptions,
  prescriptionItems,
  radiologyStudies,
  queueEntries,
  patients,
  medications,
  labPanels,
  labPanelTests,
} from "@/db/schema";
import { eq, and, count, desc, sql, inArray } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { OrderType, OrderStatus, QueueType, QueueStatus, StudyStatus, PrescriptionStatus } from "@/lib/types/enums";

const ORDER_PREFIX: Record<string, string> = {
  [OrderType.LABORATORY]: "LAB",
  [OrderType.RADIOLOGY]: "RAD",
  [OrderType.MEDICATION]: "MED",
};

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

async function nextQueueNumber(tx: Tx, queueType: string): Promise<number> {
  const maxResult = await tx
    .select({ maxNum: sql<number | null>`MAX(${queueEntries.queueNumber})` })
    .from(queueEntries)
    .where(eq(queueEntries.queueType, queueType));
  return (maxResult[0]?.maxNum ?? 0) + 1;
}

export async function listOrders(opts: {
  type?: string;
  status?: string;
  patientId?: string;
  encounterId?: string;
  priority?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.type) conditions.push(eq(clinicalOrders.type, opts.type));
  if (opts.status) conditions.push(eq(clinicalOrders.status, opts.status));
  if (opts.patientId) conditions.push(eq(clinicalOrders.patientId, opts.patientId));
  if (opts.encounterId) conditions.push(eq(clinicalOrders.encounterId, opts.encounterId));
  if (opts.priority) conditions.push(eq(clinicalOrders.priority, opts.priority));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: clinicalOrders.id,
        orderNumber: clinicalOrders.orderNumber,
        type: clinicalOrders.type,
        patientId: clinicalOrders.patientId,
        encounterId: clinicalOrders.encounterId,
        consultationId: clinicalOrders.consultationId,
        orderingProviderId: clinicalOrders.orderingProviderId,
        departmentId: clinicalOrders.departmentId,
        priority: clinicalOrders.priority,
        status: clinicalOrders.status,
        clinicalNotes: clinicalOrders.clinicalNotes,
        createdAt: clinicalOrders.createdAt,
        updatedAt: clinicalOrders.updatedAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(clinicalOrders)
      .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
      .where(where)
      .orderBy(desc(clinicalOrders.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(clinicalOrders).where(where),
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

export async function getOrderById(id: string) {
  const rows = await db
    .select({
      id: clinicalOrders.id,
      orderNumber: clinicalOrders.orderNumber,
      type: clinicalOrders.type,
      sequenceNumber: clinicalOrders.sequenceNumber,
      patientId: clinicalOrders.patientId,
      encounterId: clinicalOrders.encounterId,
      consultationId: clinicalOrders.consultationId,
      orderingProviderId: clinicalOrders.orderingProviderId,
      departmentId: clinicalOrders.departmentId,
      priority: clinicalOrders.priority,
      status: clinicalOrders.status,
      clinicalNotes: clinicalOrders.clinicalNotes,
      createdAt: clinicalOrders.createdAt,
      createdBy: clinicalOrders.createdBy,
      updatedAt: clinicalOrders.updatedAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
    })
    .from(clinicalOrders)
    .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
    .where(eq(clinicalOrders.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const order = rows[0];

  let child: Record<string, unknown> | null = null;

  if (order.type === OrderType.LABORATORY) {
    const labRows = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.orderId, id))
      .limit(1);
    if (labRows[0]) {
      const tests = await db
        .select()
        .from(labOrderTests)
        .where(eq(labOrderTests.labOrderId, labRows[0].id));
      child = { ...labRows[0], tests };
    }
  } else if (order.type === OrderType.RADIOLOGY) {
    const radRows = await db
      .select()
      .from(radiologyOrders)
      .where(eq(radiologyOrders.orderId, id))
      .limit(1);
    child = radRows[0] ?? null;
  } else if (order.type === OrderType.MEDICATION) {
    const rxRows = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.orderId, id))
      .limit(1);
    if (rxRows[0]) {
      const items = await db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, rxRows[0].id));
      child = { ...rxRows[0], items };
    }
  }

  return { ...order, child };
}

export async function createOrder(
  input: {
    type: string;
    patientId: string;
    encounterId: string;
    consultationId?: string | null;
    orderingProviderId: string;
    departmentId?: string | null;
    priority?: string;
    clinicalNotes?: string | null;
    lab?: {
      panelId?: string | null;
      testIds: string[];
      notes?: string | null;
    };
    radiology?: {
      procedureId: string;
      clinicalQuestion?: string | null;
    };
    medication?: {
      items: Array<{
        medicationId: string;
        dose: string;
        route: string;
        frequency: string;
        durationDays?: number | null;
        quantity: number;
        instructions?: string | null;
      }>;
      notes?: string | null;
    };
  },
  userId: string,
  meta: RequestMeta
) {
  const prefix = ORDER_PREFIX[input.type];
  if (!prefix) throw new ValidationError(`Unsupported order type: ${input.type}`);

  if (input.type === OrderType.LABORATORY && (!input.lab || input.lab.testIds.length === 0)) {
    throw new ValidationError("Laboratory orders require at least one test.");
  }
  if (input.type === OrderType.RADIOLOGY && !input.radiology) {
    throw new ValidationError("Radiology orders require procedure details.");
  }
  if (input.type === OrderType.MEDICATION && (!input.medication || input.medication.items.length === 0)) {
    throw new ValidationError("Medication orders require at least one item.");
  }

  const result = await db.transaction(async (tx) => {
    const seq = await nextOrderSequence(tx, input.type);
    const orderId = randomUUID();
    const orderNumber = `${prefix}-${padSeq(seq)}`;

    const [order] = await tx
      .insert(clinicalOrders)
      .values({
        id: orderId,
        orderNumber,
        type: input.type,
        sequenceNumber: seq,
        patientId: input.patientId,
        encounterId: input.encounterId,
        consultationId: input.consultationId ?? null,
        orderingProviderId: input.orderingProviderId,
        departmentId: input.departmentId ?? null,
        priority: input.priority ?? "normal",
        status: OrderStatus.ORDERED,
        clinicalNotes: input.clinicalNotes ?? null,
        createdBy: userId,
      })
      .returning();

    let child: Record<string, unknown> = {};

    if (input.type === OrderType.LABORATORY && input.lab) {
      // If panelId provided, expand panel tests into testIds
      let testIds = [...input.lab.testIds];
      if (input.lab.panelId) {
        const panelTests = await tx
          .select({ testId: labPanelTests.testId })
          .from(labPanelTests)
          .where(eq(labPanelTests.panelId, input.lab.panelId));
        const panelTestIds = panelTests.map((t) => t.testId);
        testIds = Array.from(new Set([...testIds, ...panelTestIds]));
      }

      const labOrderId = randomUUID();
      const [labOrder] = await tx
        .insert(labOrders)
        .values({
          id: labOrderId,
          orderId,
          panelId: input.lab.panelId ?? null,
          notes: input.lab.notes ?? null,
        })
        .returning();

      const testRows = testIds.map((testId) => ({
        id: randomUUID(),
        labOrderId,
        testId,
      }));
      await tx.insert(labOrderTests).values(testRows);

      child = { ...labOrder, tests: testRows };
    } else if (input.type === OrderType.RADIOLOGY && input.radiology) {
      const [radOrder] = await tx
        .insert(radiologyOrders)
        .values({
          id: randomUUID(),
          orderId,
          procedureId: input.radiology.procedureId,
          clinicalQuestion: input.radiology.clinicalQuestion ?? null,
        })
        .returning();
      child = radOrder;
    } else if (input.type === OrderType.MEDICATION && input.medication) {
      const rxId = randomUUID();
      const [rx] = await tx
        .insert(prescriptions)
        .values({
          id: rxId,
          orderId,
          patientId: input.patientId,
          encounterId: input.encounterId,
          prescriberId: input.orderingProviderId,
          status: PrescriptionStatus.PENDING,
          notes: input.medication.notes ?? null,
          createdBy: userId,
        })
        .returning();

      const itemRows = input.medication.items.map((item) => ({
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

      child = { ...rx, items: itemRows };
    }

    return { order, child };
  });

  await logAudit({
    userId,
    action: "ORDER_CREATED",
    module: "orders",
    entity: "clinical_order",
    entityId: result.order.id,
    newValues: {
      orderNumber: result.order.orderNumber,
      type: input.type,
      patientId: input.patientId,
      encounterId: input.encounterId,
      priority: result.order.priority,
    },
    ...meta,
  });

  return { ...result.order, child: result.child };
}

export async function updateOrder(
  id: string,
  input: { priority?: string; clinicalNotes?: string | null },
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(clinicalOrders).where(eq(clinicalOrders.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const existing = rows[0];

  if (existing.status === OrderStatus.COMPLETED || existing.status === OrderStatus.CANCELLED) {
    throw new ConflictError("Cannot update a completed or cancelled order");
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.clinicalNotes !== undefined) updateData.clinicalNotes = input.clinicalNotes;

  const [updated] = await db
    .update(clinicalOrders)
    .set(updateData)
    .where(eq(clinicalOrders.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ORDER_UPDATED",
    module: "orders",
    entity: "clinical_order",
    entityId: id,
    oldValues: { priority: existing.priority, clinicalNotes: existing.clinicalNotes },
    newValues: { priority: updated.priority, clinicalNotes: updated.clinicalNotes },
    ...meta,
  });

  return updated;
}

export async function acknowledgeOrder(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(clinicalOrders).where(eq(clinicalOrders.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const existing = rows[0];

  if (existing.status !== OrderStatus.ORDERED) {
    throw new ConflictError("Only ordered orders can be acknowledged");
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(clinicalOrders)
      .set({ status: OrderStatus.ACKNOWLEDGED, updatedAt: new Date() })
      .where(eq(clinicalOrders.id, id))
      .returning();

    // Create queue entry for lab/pharmacy, or radiology_study for radiology
    if (existing.type === OrderType.LABORATORY || existing.type === OrderType.MEDICATION) {
      const queueType = existing.type === OrderType.LABORATORY ? QueueType.LABORATORY : QueueType.PHARMACY;
      const qNum = await nextQueueNumber(tx, queueType);
      await tx.insert(queueEntries).values({
        id: randomUUID(),
        queueNumber: qNum,
        queueType,
        priority: existing.priority === "emergency" ? "emergency" : existing.priority === "urgent" ? "urgent" : "normal",
        departmentId: existing.departmentId,
        patientId: existing.patientId,
        encounterId: existing.encounterId,
        status: QueueStatus.WAITING,
        notes: existing.clinicalNotes,
        createdBy: userId,
      });
    } else if (existing.type === OrderType.RADIOLOGY) {
      // Get modality from procedure
      const radOrderRows = await tx
        .select({ procedureId: radiologyOrders.procedureId })
        .from(radiologyOrders)
        .where(eq(radiologyOrders.orderId, id))
        .limit(1);

      let modalityId: string | null = null;
      if (radOrderRows[0]) {
        const { radiologyProcedures } = await import("@/db/schema");
        const procRows = await tx
          .select({ modalityId: radiologyProcedures.modalityId })
          .from(radiologyProcedures)
          .where(eq(radiologyProcedures.id, radOrderRows[0].procedureId))
          .limit(1);
        modalityId = procRows[0]?.modalityId ?? null;
      }

      await tx.insert(radiologyStudies).values({
        id: randomUUID(),
        orderId: id,
        modalityId,
        status: StudyStatus.SCHEDULED,
      });
    }

    return updated;
  });

  await logAudit({
    userId,
    action: "ORDER_ACKNOWLEDGED",
    module: "orders",
    entity: "clinical_order",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: OrderStatus.ACKNOWLEDGED },
    ...meta,
  });

  return result;
}

export async function cancelOrder(id: string, reason: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(clinicalOrders).where(eq(clinicalOrders.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const existing = rows[0];

  if (existing.status === OrderStatus.COMPLETED || existing.status === OrderStatus.CANCELLED) {
    throw new ConflictError("Cannot cancel a completed or already cancelled order");
  }

  const [updated] = await db
    .update(clinicalOrders)
    .set({
      status: OrderStatus.CANCELLED,
      clinicalNotes: existing.clinicalNotes
        ? `${existing.clinicalNotes}\n[CANCELLED] ${reason}`
        : `[CANCELLED] ${reason}`,
      updatedAt: new Date(),
    })
    .where(eq(clinicalOrders.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ORDER_CANCELLED",
    module: "orders",
    entity: "clinical_order",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: OrderStatus.CANCELLED, reason },
    ...meta,
  });

  return updated;
}

export async function rejectOrder(id: string, reason: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(clinicalOrders).where(eq(clinicalOrders.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const existing = rows[0];

  if (existing.status !== OrderStatus.ORDERED && existing.status !== OrderStatus.ACKNOWLEDGED) {
    throw new ConflictError("Only ordered or acknowledged orders can be rejected");
  }

  const [updated] = await db
    .update(clinicalOrders)
    .set({
      status: OrderStatus.REJECTED,
      clinicalNotes: existing.clinicalNotes
        ? `${existing.clinicalNotes}\n[REJECTED] ${reason}`
        : `[REJECTED] ${reason}`,
      updatedAt: new Date(),
    })
    .where(eq(clinicalOrders.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ORDER_REJECTED",
    module: "orders",
    entity: "clinical_order",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: OrderStatus.REJECTED, reason },
    ...meta,
  });

  return updated;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.ORDERED, OrderStatus.CANCELLED],
  [OrderStatus.ORDERED]: [OrderStatus.ACKNOWLEDGED, OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED, OrderStatus.REJECTED],
  [OrderStatus.ACKNOWLEDGED]: [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED],
  [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
};

export async function updateOrderStatus(id: string, status: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(clinicalOrders).where(eq(clinicalOrders.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Order");
  const existing = rows[0];

  const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ConflictError(`Cannot transition order from ${existing.status} to ${status}`);
  }

  const [updated] = await db
    .update(clinicalOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(clinicalOrders.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ORDER_STATUS_CHANGED",
    module: "orders",
    entity: "clinical_order",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status },
    ...meta,
  });

  return updated;
}

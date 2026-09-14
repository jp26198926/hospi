import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { queueEntries, patients, staffProfiles } from "@/db/schema";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { QueueStatus } from "@/lib/types/enums";

export async function listQueueEntries(opts: {
  queueType: string;
  status?: string;
  departmentId?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(queueEntries.queueType, opts.queueType)];

  if (opts.status) {
    conditions.push(eq(queueEntries.status, opts.status));
  } else {
    // Default: show active entries
    conditions.push(
      inArray(queueEntries.status, [
        QueueStatus.WAITING,
        QueueStatus.CALLED,
        QueueStatus.IN_PROGRESS,
      ])
    );
  }
  if (opts.departmentId) conditions.push(eq(queueEntries.departmentId, opts.departmentId));

  const where = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: queueEntries.id,
        queueNumber: queueEntries.queueNumber,
        queueType: queueEntries.queueType,
        priority: queueEntries.priority,
        departmentId: queueEntries.departmentId,
        serviceId: queueEntries.serviceId,
        patientId: queueEntries.patientId,
        encounterId: queueEntries.encounterId,
        status: queueEntries.status,
        assignedStaffId: queueEntries.assignedStaffId,
        calledTime: queueEntries.calledTime,
        completedTime: queueEntries.completedTime,
        notes: queueEntries.notes,
        createdAt: queueEntries.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        staffFirstName: staffProfiles.firstName,
        staffLastName: staffProfiles.lastName,
      })
      .from(queueEntries)
      .leftJoin(patients, eq(queueEntries.patientId, patients.id))
      .leftJoin(staffProfiles, eq(queueEntries.assignedStaffId, staffProfiles.userId))
      .where(where)
      .orderBy(queueEntries.priority, queueEntries.queueNumber)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(queueEntries).where(where),
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

export async function createQueueEntry(
  input: {
    queueType: string;
    patientId: string;
    encounterId: string;
    departmentId?: string | null;
    serviceId?: string | null;
    priority?: string;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Get next queue number
  const maxResult = await db
    .select({ maxNum: sql<number | null>`MAX(${queueEntries.queueNumber})` })
    .from(queueEntries)
    .where(eq(queueEntries.queueType, input.queueType));
  const nextNum = (maxResult[0]?.maxNum ?? 0) + 1;

  const id = randomUUID();
  const [entry] = await db
    .insert(queueEntries)
    .values({
      id,
      queueNumber: nextNum,
      queueType: input.queueType,
      priority: input.priority ?? "normal",
      departmentId: input.departmentId ?? null,
      serviceId: input.serviceId ?? null,
      patientId: input.patientId,
      encounterId: input.encounterId,
      status: QueueStatus.WAITING,
      notes: input.notes ?? null,
      createdBy: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "QUEUE_ENQUEUED",
    module: "queue",
    entity: "queue_entry",
    entityId: id,
    newValues: {
      queueNumber: nextNum,
      queueType: input.queueType,
      patientId: input.patientId,
      encounterId: input.encounterId,
    },
    ...meta,
  });

  return entry;
}

export async function callQueueEntry(
  id: string,
  staffId: string,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(queueEntries).where(eq(queueEntries.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Queue entry");
  const existing = rows[0];

  if (existing.status !== QueueStatus.WAITING) {
    throw new ConflictError("Only waiting entries can be called");
  }

  const [updated] = await db
    .update(queueEntries)
    .set({
      status: QueueStatus.CALLED,
      calledTime: new Date(),
      assignedStaffId: staffId,
      updatedAt: new Date(),
    })
    .where(eq(queueEntries.id, id))
    .returning();

  await logAudit({
    userId,
    action: "QUEUE_CALLED",
    module: "queue",
    entity: "queue_entry",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: QueueStatus.CALLED, assignedStaffId: staffId },
    ...meta,
  });

  return updated;
}

export async function completeQueueEntry(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(queueEntries).where(eq(queueEntries.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Queue entry");
  const existing = rows[0];

  if (existing.status !== QueueStatus.CALLED && existing.status !== QueueStatus.IN_PROGRESS) {
    throw new ConflictError("Only called or in-progress entries can be completed");
  }

  const [updated] = await db
    .update(queueEntries)
    .set({
      status: QueueStatus.COMPLETED,
      completedTime: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(queueEntries.id, id))
    .returning();

  await logAudit({
    userId,
    action: "QUEUE_COMPLETED",
    module: "queue",
    entity: "queue_entry",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: QueueStatus.COMPLETED },
    ...meta,
  });

  return updated;
}

export async function updateQueuePriority(
  id: string,
  priority: string,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(queueEntries).where(eq(queueEntries.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Queue entry");
  const existing = rows[0];

  const [updated] = await db
    .update(queueEntries)
    .set({ priority, updatedAt: new Date() })
    .where(eq(queueEntries.id, id))
    .returning();

  await logAudit({
    userId,
    action: "QUEUE_PRIORITY_CHANGED",
    module: "queue",
    entity: "queue_entry",
    entityId: id,
    oldValues: { priority: existing.priority },
    newValues: { priority },
    ...meta,
  });

  return updated;
}

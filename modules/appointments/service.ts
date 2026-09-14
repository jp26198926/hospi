import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { appointments, patients, encounters, queueEntries, staffProfiles } from "@/db/schema";
import { eq, and, count, sql, lt, gt, ne } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { AppointmentStatus, EncounterStatus, EncounterType, QueueType, QueueStatus } from "@/lib/types/enums";

export async function listAppointments(opts: {
  date?: string;
  staffId?: string;
  patientId?: string;
  status?: string;
  departmentId?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.date) conditions.push(eq(appointments.date, opts.date));
  if (opts.staffId) conditions.push(eq(appointments.staffId, opts.staffId));
  if (opts.patientId) conditions.push(eq(appointments.patientId, opts.patientId));
  if (opts.status) conditions.push(eq(appointments.status, opts.status));
  if (opts.departmentId) conditions.push(eq(appointments.departmentId, opts.departmentId));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        staffId: appointments.staffId,
        departmentId: appointments.departmentId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        cancellationReason: appointments.cancellationReason,
        createdAt: appointments.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        staffFirstName: staffProfiles.firstName,
        staffLastName: staffProfiles.lastName,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(staffProfiles, eq(appointments.staffId, staffProfiles.id))
      .where(where)
      .orderBy(appointments.date, appointments.startTime)
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(appointments).where(where),
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

export async function getAppointmentById(id: string) {
  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      staffId: appointments.staffId,
      departmentId: appointments.departmentId,
      serviceId: appointments.serviceId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      cancellationReason: appointments.cancellationReason,
      cancelledAt: appointments.cancelledAt,
      cancelledBy: appointments.cancelledBy,
      createdAt: appointments.createdAt,
      createdBy: appointments.createdBy,
      updatedAt: appointments.updatedAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
      staffFirstName: staffProfiles.firstName,
      staffLastName: staffProfiles.lastName,
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(staffProfiles, eq(appointments.staffId, staffProfiles.id))
    .where(eq(appointments.id, id))
    .limit(1);

  if (!rows[0]) throw new NotFoundError("Appointment");
  return rows[0];
}

async function checkDoubleBooking(
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const conditions = [
    eq(appointments.staffId, staffId),
    eq(appointments.date, date),
    ne(appointments.status, AppointmentStatus.CANCELLED),
    ne(appointments.status, AppointmentStatus.NO_SHOW),
    // Overlap: existing.start < new.end AND existing.end > new.start
    lt(appointments.startTime, endTime),
    gt(appointments.endTime, startTime),
  ];
  if (excludeId) conditions.push(ne(appointments.id, excludeId));

  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(...conditions))
    .limit(1);

  return conflicts.length > 0;
}

export async function createAppointment(
  input: {
    patientId: string;
    staffId?: string | null;
    departmentId: string;
    serviceId?: string | null;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Verify patient exists
  const patient = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!patient[0]) throw new NotFoundError("Patient");

  // Check double-booking
  if (input.staffId) {
    const hasConflict = await checkDoubleBooking(
      input.staffId,
      input.date,
      input.startTime,
      input.endTime
    );
    if (hasConflict) {
      throw new ConflictError("Staff already has an overlapping appointment at this time");
    }
  }

  const id = randomUUID();
  const [appointment] = await db
    .insert(appointments)
    .values({
      id,
      patientId: input.patientId,
      staffId: input.staffId ?? null,
      departmentId: input.departmentId,
      serviceId: input.serviceId ?? null,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: AppointmentStatus.SCHEDULED,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "APPOINTMENT_SCHEDULED",
    module: "appointments",
    entity: "appointment",
    entityId: id,
    newValues: {
      patientId: input.patientId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      staffId: input.staffId,
    },
    ...meta,
  });

  return appointment;
}

export async function updateAppointment(
  id: string,
  input: Record<string, unknown>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Appointment");
  const existing = rows[0];

  // If updating time or staff, re-check double booking
  if (input.staffId || input.date || input.startTime || input.endTime) {
    const staffId = (input.staffId as string) ?? existing.staffId;
    const date = (input.date as string) ?? existing.date;
    const startTime = (input.startTime as string) ?? existing.startTime;
    const endTime = (input.endTime as string) ?? existing.endTime;
    if (staffId) {
      const hasConflict = await checkDoubleBooking(staffId, date, startTime, endTime, id);
      if (hasConflict) {
        throw new ConflictError("Staff already has an overlapping appointment at this time");
      }
    }
  }

  const [updated] = await db
    .update(appointments)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  await logAudit({
    userId,
    action: "APPOINTMENT_UPDATED",
    module: "appointments",
    entity: "appointment",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

export async function checkInAppointment(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Appointment");
  const existing = rows[0];

  if (
    existing.status !== AppointmentStatus.SCHEDULED &&
    existing.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictError("Only scheduled or confirmed appointments can be checked in");
  }

  const result = await db.transaction(async (tx) => {
    // Update appointment status
    const [updated] = await tx
      .update(appointments)
      .set({ status: AppointmentStatus.CHECKED_IN, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    // Create encounter
    const encounterId = randomUUID();
    const [encounter] = await tx
      .insert(encounters)
      .values({
        id: encounterId,
        patientId: existing.patientId,
        type: EncounterType.OUTPATIENT,
        status: EncounterStatus.REGISTERED,
        departmentId: existing.departmentId,
        createdBy: userId,
      })
      .returning();

    // Get next queue number for reception
    const maxResult = await tx
      .select({ maxNum: sql<number | null>`MAX(${queueEntries.queueNumber})` })
      .from(queueEntries)
      .where(eq(queueEntries.queueType, QueueType.RECEPTION));
    const nextNum = (maxResult[0]?.maxNum ?? 0) + 1;

    // Create queue entry
    const queueId = randomUUID();
    const [queueEntry] = await tx
      .insert(queueEntries)
      .values({
        id: queueId,
        queueNumber: nextNum,
        queueType: QueueType.RECEPTION,
        priority: "normal",
        departmentId: existing.departmentId,
        serviceId: existing.serviceId,
        patientId: existing.patientId,
        encounterId,
        status: QueueStatus.WAITING,
        createdBy: userId,
      })
      .returning();

    return { appointment: updated, encounter, queueEntry };
  });

  await logAudit({
    userId,
    action: "APPOINTMENT_CHECKED_IN",
    module: "appointments",
    entity: "appointment",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: {
      status: AppointmentStatus.CHECKED_IN,
      encounterId: result.encounter.id,
      queueEntryId: result.queueEntry.id,
    },
    ...meta,
  });

  return result;
}

export async function cancelAppointment(
  id: string,
  reason: string,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Appointment");
  const existing = rows[0];

  if (
    existing.status !== AppointmentStatus.SCHEDULED &&
    existing.status !== AppointmentStatus.CONFIRMED &&
    existing.status !== AppointmentStatus.CHECKED_IN
  ) {
    throw new ConflictError("Only scheduled, confirmed, or checked-in appointments can be cancelled");
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status: AppointmentStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id))
    .returning();

  await logAudit({
    userId,
    action: "APPOINTMENT_CANCELLED",
    module: "appointments",
    entity: "appointment",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: AppointmentStatus.CANCELLED, reason },
    ...meta,
  });

  return updated;
}

export async function markNoShow(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Appointment");
  const existing = rows[0];

  if (
    existing.status !== AppointmentStatus.SCHEDULED &&
    existing.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictError("Only scheduled or confirmed appointments can be marked as no-show");
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: AppointmentStatus.NO_SHOW, updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  await logAudit({
    userId,
    action: "APPOINTMENT_NO_SHOW",
    module: "appointments",
    entity: "appointment",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: AppointmentStatus.NO_SHOW },
    ...meta,
  });

  return updated;
}

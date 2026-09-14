import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { encounters, patients, consultations } from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { EncounterStatus } from "@/lib/types/enums";

export async function listEncounters(opts: {
  patientId?: string;
  status?: string;
  type?: string;
  departmentId?: string;
  date?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.patientId) conditions.push(eq(encounters.patientId, opts.patientId));
  if (opts.status) conditions.push(eq(encounters.status, opts.status));
  if (opts.type) conditions.push(eq(encounters.type, opts.type));
  if (opts.departmentId) conditions.push(eq(encounters.departmentId, opts.departmentId));
  if (opts.date) {
    conditions.push(sql`${encounters.startedAt}::date = ${opts.date}::date`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: encounters.id,
        patientId: encounters.patientId,
        type: encounters.type,
        status: encounters.status,
        departmentId: encounters.departmentId,
        attendingProviderId: encounters.attendingProviderId,
        startedAt: encounters.startedAt,
        endedAt: encounters.endedAt,
        notes: encounters.notes,
        createdAt: encounters.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(encounters)
      .leftJoin(patients, eq(encounters.patientId, patients.id))
      .where(where)
      .orderBy(desc(encounters.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(encounters).where(where),
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

export async function getEncounterById(id: string) {
  const rows = await db
    .select({
      id: encounters.id,
      patientId: encounters.patientId,
      type: encounters.type,
      status: encounters.status,
      departmentId: encounters.departmentId,
      attendingProviderId: encounters.attendingProviderId,
      startedAt: encounters.startedAt,
      endedAt: encounters.endedAt,
      notes: encounters.notes,
      createdAt: encounters.createdAt,
      createdBy: encounters.createdBy,
      updatedAt: encounters.updatedAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
      patientDateOfBirth: patients.dateOfBirth,
      patientSex: patients.sex,
    })
    .from(encounters)
    .leftJoin(patients, eq(encounters.patientId, patients.id))
    .where(eq(encounters.id, id))
    .limit(1);

  if (!rows[0]) throw new NotFoundError("Encounter");
  return rows[0];
}

export async function createEncounter(
  input: {
    patientId: string;
    type: string;
    departmentId?: string | null;
    attendingProviderId?: string | null;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const patient = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!patient[0]) throw new NotFoundError("Patient");

  const id = randomUUID();
  const [encounter] = await db
    .insert(encounters)
    .values({
      id,
      patientId: input.patientId,
      type: input.type,
      status: EncounterStatus.REGISTERED,
      departmentId: input.departmentId ?? null,
      attendingProviderId: input.attendingProviderId ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "ENCOUNTER_CREATED",
    module: "encounters",
    entity: "encounter",
    entityId: id,
    newValues: { patientId: input.patientId, type: input.type },
    ...meta,
  });

  return encounter;
}

export async function updateEncounter(
  id: string,
  input: Record<string, unknown>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Encounter");
  const existing = rows[0];

  const [updated] = await db
    .update(encounters)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(encounters.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ENCOUNTER_UPDATED",
    module: "encounters",
    entity: "encounter",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

export async function closeEncounter(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Encounter");
  const existing = rows[0];

  if (existing.status === EncounterStatus.COMPLETED || existing.status === EncounterStatus.CANCELLED) {
    throw new ConflictError("Encounter is already closed");
  }

  // Check for draft consultations
  const drafts = await db
    .select({ id: consultations.id })
    .from(consultations)
    .where(and(eq(consultations.encounterId, id), eq(consultations.status, "draft")))
    .limit(1);
  if (drafts.length > 0) {
    throw new ConflictError("Cannot close encounter with draft consultations");
  }

  const [updated] = await db
    .update(encounters)
    .set({
      status: EncounterStatus.COMPLETED,
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(encounters.id, id))
    .returning();

  await logAudit({
    userId,
    action: "ENCOUNTER_CLOSED",
    module: "encounters",
    entity: "encounter",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: EncounterStatus.COMPLETED, endedAt: updated.endedAt },
    ...meta,
  });

  return updated;
}

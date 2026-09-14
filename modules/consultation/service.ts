import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { consultations, diagnoses, encounters, patients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { EncounterStatus, ConsultationStatus } from "@/lib/types/enums";

export async function listConsultationsByEncounter(encounterId: string) {
  return db
    .select()
    .from(consultations)
    .where(eq(consultations.encounterId, encounterId))
    .orderBy(desc(consultations.createdAt));
}

export async function getConsultationById(id: string) {
  const rows = await db
    .select()
    .from(consultations)
    .where(eq(consultations.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Consultation");
  const consultation = rows[0];

  const dx = await db
    .select()
    .from(diagnoses)
    .where(eq(diagnoses.consultationId, id))
    .orderBy(desc(diagnoses.createdAt));

  return { ...consultation, diagnoses: dx };
}

export async function createConsultation(
  input: {
    encounterId: string;
    patientId: string;
    providerId: string;
    chiefComplaint?: string | null;
    history?: string | null;
    examination?: string | null;
    assessment?: string | null;
    treatmentPlan?: string | null;
    clinicalNotes?: string | null;
    followUpDate?: string | null;
    followUpInstructions?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Verify encounter exists
  const encRows = await db
    .select({ id: encounters.id, status: encounters.status })
    .from(encounters)
    .where(eq(encounters.id, input.encounterId))
    .limit(1);
  if (!encRows[0]) throw new NotFoundError("Encounter");

  // Verify patient exists
  const patRows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!patRows[0]) throw new NotFoundError("Patient");

  const id = randomUUID();
  const [consultation] = await db
    .insert(consultations)
    .values({
      id,
      encounterId: input.encounterId,
      patientId: input.patientId,
      providerId: input.providerId,
      status: ConsultationStatus.DRAFT,
      chiefComplaint: input.chiefComplaint ?? null,
      history: input.history ?? null,
      examination: input.examination ?? null,
      assessment: input.assessment ?? null,
      treatmentPlan: input.treatmentPlan ?? null,
      clinicalNotes: input.clinicalNotes ?? null,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      followUpInstructions: input.followUpInstructions ?? null,
      createdBy: userId,
    })
    .returning();

  // Update encounter status
  await db
    .update(encounters)
    .set({ status: EncounterStatus.IN_CONSULTATION, updatedAt: new Date() })
    .where(eq(encounters.id, input.encounterId));

  await logAudit({
    userId,
    action: "CONSULTATION_STARTED",
    module: "consultation",
    entity: "consultation",
    entityId: id,
    newValues: {
      encounterId: input.encounterId,
      patientId: input.patientId,
      providerId: input.providerId,
    },
    ...meta,
  });

  return consultation;
}

export async function updateConsultation(
  id: string,
  input: Record<string, unknown>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Consultation");
  const existing = rows[0];

  if (existing.status !== ConsultationStatus.DRAFT) {
    throw new ConflictError("Only draft consultations can be updated");
  }

  // Handle followUpDate conversion
  const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.followUpDate !== undefined) {
    updateData.followUpDate = input.followUpDate ? new Date(input.followUpDate as string) : null;
  }

  const [updated] = await db
    .update(consultations)
    .set(updateData)
    .where(eq(consultations.id, id))
    .returning();

  await logAudit({
    userId,
    action: "CONSULTATION_UPDATED",
    module: "consultation",
    entity: "consultation",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

export async function finalizeConsultation(id: string, userId: string, meta: RequestMeta) {
  const rows = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Consultation");
  const existing = rows[0];

  if (existing.status !== ConsultationStatus.DRAFT) {
    throw new ConflictError("Only draft consultations can be finalized");
  }

  const [updated] = await db
    .update(consultations)
    .set({
      status: ConsultationStatus.FINALIZED,
      finalizedAt: new Date(),
      finalizedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(consultations.id, id))
    .returning();

  await logAudit({
    userId,
    action: "CONSULTATION_FINALIZED",
    module: "consultation",
    entity: "consultation",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: ConsultationStatus.FINALIZED, finalizedAt: updated.finalizedAt },
    ...meta,
  });

  return updated;
}

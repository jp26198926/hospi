import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { diagnoses, consultations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { ConsultationStatus } from "@/lib/types/enums";

export async function listDiagnosesByEncounter(encounterId: string) {
  return db
    .select()
    .from(diagnoses)
    .where(eq(diagnoses.encounterId, encounterId))
    .orderBy(desc(diagnoses.createdAt));
}

export async function listDiagnosesByConsultation(consultationId: string) {
  return db
    .select()
    .from(diagnoses)
    .where(eq(diagnoses.consultationId, consultationId))
    .orderBy(desc(diagnoses.createdAt));
}

export async function createDiagnosis(
  input: {
    consultationId: string;
    encounterId: string;
    diagnosisCodeId?: string | null;
    code: string;
    name: string;
    type?: string;
    isPrimary?: boolean;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Verify consultation exists and is draft
  const consRows = await db
    .select({ id: consultations.id, status: consultations.status })
    .from(consultations)
    .where(eq(consultations.id, input.consultationId))
    .limit(1);
  if (!consRows[0]) throw new NotFoundError("Consultation");
  if (consRows[0].status !== ConsultationStatus.DRAFT) {
    throw new ConflictError("Cannot add diagnoses to a finalized consultation");
  }

  const id = randomUUID();
  const [diagnosis] = await db
    .insert(diagnoses)
    .values({
      id,
      consultationId: input.consultationId,
      encounterId: input.encounterId,
      diagnosisCodeId: input.diagnosisCodeId ?? null,
      code: input.code,
      name: input.name,
      type: input.type ?? "clinical",
      isPrimary: input.isPrimary ?? false,
      providerId: userId,
      notes: input.notes ?? null,
    })
    .returning();

  await logAudit({
    userId,
    action: "DIAGNOSIS_ADDED",
    module: "diagnosis",
    entity: "diagnosis",
    entityId: id,
    newValues: {
      consultationId: input.consultationId,
      code: input.code,
      name: input.name,
      type: input.type,
    },
    ...meta,
  });

  return diagnosis;
}

export async function updateDiagnosis(
  id: string,
  input: Record<string, unknown>,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db.select().from(diagnoses).where(eq(diagnoses.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Diagnosis");
  const existing = rows[0];

  const [updated] = await db
    .update(diagnoses)
    .set(input)
    .where(eq(diagnoses.id, id))
    .returning();

  await logAudit({
    userId,
    action: "DIAGNOSIS_UPDATED",
    module: "diagnosis",
    entity: "diagnosis",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

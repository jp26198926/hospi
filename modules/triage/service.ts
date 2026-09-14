import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { triageRecords, encounters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { EncounterStatus } from "@/lib/types/enums";

export async function listTriageRecords(encounterId: string) {
  return db
    .select()
    .from(triageRecords)
    .where(eq(triageRecords.encounterId, encounterId))
    .orderBy(desc(triageRecords.recordedAt));
}

export async function createTriageRecord(
  input: {
    encounterId: string;
    temperature?: number | null;
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    heartRate?: number | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    weight?: number | null;
    height?: number | null;
    painScore?: number | null;
    chiefComplaint?: string | null;
    allergies?: string | null;
    triageCategory?: string | null;
    notes?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Verify encounter exists
  const encRows = await db
    .select({ id: encounters.id })
    .from(encounters)
    .where(eq(encounters.id, input.encounterId))
    .limit(1);
  if (!encRows[0]) throw new NotFoundError("Encounter");

  const id = randomUUID();
  const [record] = await db
    .insert(triageRecords)
    .values({
      id,
      encounterId: input.encounterId,
      temperature: input.temperature ?? null,
      bpSystolic: input.bpSystolic ?? null,
      bpDiastolic: input.bpDiastolic ?? null,
      heartRate: input.heartRate ?? null,
      respiratoryRate: input.respiratoryRate ?? null,
      oxygenSaturation: input.oxygenSaturation ?? null,
      weight: input.weight ?? null,
      height: input.height ?? null,
      painScore: input.painScore ?? null,
      chiefComplaint: input.chiefComplaint ?? null,
      allergies: input.allergies ?? null,
      triageCategory: input.triageCategory ?? null,
      notes: input.notes ?? null,
      recordedBy: userId,
    })
    .returning();

  // Update encounter status to in_triage
  await db
    .update(encounters)
    .set({ status: EncounterStatus.IN_TRIAGE, updatedAt: new Date() })
    .where(eq(encounters.id, input.encounterId));

  await logAudit({
    userId,
    action: "TRIAGE_RECORDED",
    module: "triage",
    entity: "triage_record",
    entityId: id,
    newValues: {
      encounterId: input.encounterId,
      triageCategory: input.triageCategory,
      chiefComplaint: input.chiefComplaint,
    },
    ...meta,
  });

  return record;
}

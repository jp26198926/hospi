import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { patients, encounters, appointments, queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import { PatientStatus } from "@/lib/types/enums";
import {
  findPatientById,
  generateMrn,
  paginatePatients,
  searchPatientRows,
} from "./repository";

export async function listPatients(opts: {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  return paginatePatients(opts);
}

export async function getPatientById(id: string) {
  const patient = await findPatientById(id);
  if (!patient) throw new NotFoundError("Patient");
  return patient;
}

export async function createPatient(
  input: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
    dateOfBirth: string;
    sex: string;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelationship?: string | null;
    bloodType?: string | null;
    allergies?: string | null;
    medicalAlerts?: string | null;
    photo?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const mrn = await generateMrn();
  const id = randomUUID();

  const [patient] = await db
    .insert(patients)
    .values({
      id,
      mrn,
      firstName: input.firstName,
      middleName: input.middleName ?? null,
      lastName: input.lastName,
      suffix: input.suffix ?? null,
      dateOfBirth: input.dateOfBirth,
      sex: input.sex,
      phone: input.phone ?? null,
      email: input.email ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? "PH",
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      bloodType: input.bloodType ?? null,
      allergies: input.allergies ?? null,
      medicalAlerts: input.medicalAlerts ?? null,
      photo: input.photo ?? null,
      status: PatientStatus.ACTIVE,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "PATIENT_CREATED",
    module: "patients",
    entity: "patient",
    entityId: id,
    newValues: { mrn, firstName: input.firstName, lastName: input.lastName },
    ...meta,
  });

  return patient;
}

export async function updatePatient(
  id: string,
  input: Record<string, unknown>,
  userId: string,
  meta: RequestMeta
) {
  const existing = await findPatientById(id);
  if (!existing) throw new NotFoundError("Patient");

  const [updated] = await db
    .update(patients)
    .set({
      ...input,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(patients.id, id))
    .returning();

  await logAudit({
    userId,
    action: "PATIENT_UPDATED",
    module: "patients",
    entity: "patient",
    entityId: id,
    oldValues: existing as Record<string, unknown>,
    newValues: updated as Record<string, unknown>,
    ...meta,
  });

  return updated;
}

export async function mergePatients(
  input: { primaryId: string; secondaryId: string; reason: string },
  userId: string,
  meta: RequestMeta
) {
  if (input.primaryId === input.secondaryId) {
    throw new ValidationError("Cannot merge a patient with themselves");
  }

  const primary = await findPatientById(input.primaryId);
  if (!primary) throw new NotFoundError("Primary patient");

  const secondary = await findPatientById(input.secondaryId);
  if (!secondary) throw new NotFoundError("Secondary patient");

  await db.transaction(async (tx) => {
    // Reassign encounters
    await tx
      .update(encounters)
      .set({ patientId: input.primaryId })
      .where(eq(encounters.patientId, input.secondaryId));

    // Reassign appointments
    await tx
      .update(appointments)
      .set({ patientId: input.primaryId })
      .where(eq(appointments.patientId, input.secondaryId));

    // Reassign queue entries
    await tx
      .update(queueEntries)
      .set({ patientId: input.primaryId })
      .where(eq(queueEntries.patientId, input.secondaryId));

    // Soft-delete secondary
    await tx
      .update(patients)
      .set({
        status: PatientStatus.MERGED,
        deletedAt: new Date(),
        deletedBy: userId,
        deletionReason: `Merged into ${primary.mrn}: ${input.reason}`,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(patients.id, input.secondaryId));
  });

  await logAudit({
    userId,
    action: "PATIENT_MERGED",
    module: "patients",
    entity: "patient",
    entityId: input.secondaryId,
    oldValues: { secondaryId: input.secondaryId, secondaryMrn: secondary.mrn },
    newValues: { primaryId: input.primaryId, primaryMrn: primary.mrn, reason: input.reason },
    ...meta,
  });

  return { primary, secondaryMrn: secondary.mrn };
}

export async function searchPatients(q: string) {
  return searchPatientRows(q, 10);
}

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  clinicalOrders,
  radiologyOrders,
  radiologyStudies,
  radiologyReports,
  radiologyProcedures,
  imagingModalities,
  patients,
} from "@/db/schema";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import {
  OrderType,
  OrderStatus,
  StudyStatus,
  ReportStatus,
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

// ─── Orders ──────────────────────────────────────────────────────

export async function listRadiologyOrders(opts: {
  status?: string;
  priority?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(clinicalOrders.type, OrderType.RADIOLOGY)];

  if (opts.status) conditions.push(eq(clinicalOrders.status, opts.status));
  if (opts.priority) conditions.push(eq(clinicalOrders.priority, opts.priority));

  const where = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: clinicalOrders.id,
        orderNumber: clinicalOrders.orderNumber,
        patientId: clinicalOrders.patientId,
        encounterId: clinicalOrders.encounterId,
        priority: clinicalOrders.priority,
        status: clinicalOrders.status,
        clinicalNotes: clinicalOrders.clinicalNotes,
        createdAt: clinicalOrders.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        radOrderId: radiologyOrders.id,
        procedureId: radiologyOrders.procedureId,
        clinicalQuestion: radiologyOrders.clinicalQuestion,
        procedureName: radiologyProcedures.name,
        modalityName: imagingModalities.name,
        studyId: radiologyStudies.id,
        studyStatus: radiologyStudies.status,
        scheduledAt: radiologyStudies.scheduledAt,
      })
      .from(clinicalOrders)
      .innerJoin(radiologyOrders, eq(radiologyOrders.orderId, clinicalOrders.id))
      .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
      .leftJoin(radiologyProcedures, eq(radiologyOrders.procedureId, radiologyProcedures.id))
      .leftJoin(imagingModalities, eq(radiologyProcedures.modalityId, imagingModalities.id))
      .leftJoin(radiologyStudies, eq(radiologyStudies.orderId, clinicalOrders.id))
      .where(where)
      .orderBy(desc(clinicalOrders.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(clinicalOrders)
      .innerJoin(radiologyOrders, eq(radiologyOrders.orderId, clinicalOrders.id))
      .where(where),
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

export async function getRadiologyOrderDetail(orderId: string) {
  const rows = await db
    .select({
      id: clinicalOrders.id,
      orderNumber: clinicalOrders.orderNumber,
      patientId: clinicalOrders.patientId,
      encounterId: clinicalOrders.encounterId,
      priority: clinicalOrders.priority,
      status: clinicalOrders.status,
      clinicalNotes: clinicalOrders.clinicalNotes,
      createdAt: clinicalOrders.createdAt,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
      radOrderId: radiologyOrders.id,
      procedureId: radiologyOrders.procedureId,
      clinicalQuestion: radiologyOrders.clinicalQuestion,
      procedureName: radiologyProcedures.name,
      procedureCode: radiologyProcedures.code,
      modalityId: radiologyProcedures.modalityId,
      modalityName: imagingModalities.name,
    })
    .from(clinicalOrders)
    .innerJoin(radiologyOrders, eq(radiologyOrders.orderId, clinicalOrders.id))
    .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
    .leftJoin(radiologyProcedures, eq(radiologyOrders.procedureId, radiologyProcedures.id))
    .leftJoin(imagingModalities, eq(radiologyProcedures.modalityId, imagingModalities.id))
    .where(eq(clinicalOrders.id, orderId))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology order");

  const studyRows = await db
    .select()
    .from(radiologyStudies)
    .where(eq(radiologyStudies.orderId, orderId))
    .limit(1);

  const reports = studyRows[0]
    ? await db
        .select()
        .from(radiologyReports)
        .where(eq(radiologyReports.studyId, studyRows[0].id))
        .orderBy(desc(radiologyReports.createdAt))
    : [];

  return {
    ...rows[0],
    study: studyRows[0] ?? null,
    reports,
  };
}

export async function createRadiologyOrder(
  input: {
    patientId: string;
    encounterId: string;
    consultationId?: string | null;
    orderingProviderId: string;
    departmentId?: string | null;
    priority?: string;
    clinicalNotes?: string | null;
    procedureId: string;
    clinicalQuestion?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const result = await db.transaction(async (tx) => {
    const seq = await nextOrderSequence(tx, OrderType.RADIOLOGY);
    const orderId = randomUUID();
    const orderNumber = `RAD-${padSeq(seq)}`;

    const [order] = await tx
      .insert(clinicalOrders)
      .values({
        id: orderId,
        orderNumber,
        type: OrderType.RADIOLOGY,
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

    const [radOrder] = await tx
      .insert(radiologyOrders)
      .values({
        id: randomUUID(),
        orderId,
        procedureId: input.procedureId,
        clinicalQuestion: input.clinicalQuestion ?? null,
      })
      .returning();

    return { order, radOrder };
  });

  await logAudit({
    userId,
    action: "RADIOLOGY_ORDER_CREATED",
    module: "radiology",
    entity: "clinical_order",
    entityId: result.order.id,
    newValues: {
      orderNumber: result.order.orderNumber,
      procedureId: input.procedureId,
      patientId: input.patientId,
    },
    ...meta,
  });

  return result;
}

// ─── Studies ─────────────────────────────────────────────────────

export async function listStudies(opts: { status?: string; page: number; limit: number }) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.status) conditions.push(eq(radiologyStudies.status, opts.status));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: radiologyStudies.id,
        orderId: radiologyStudies.orderId,
        modalityId: radiologyStudies.modalityId,
        scheduledAt: radiologyStudies.scheduledAt,
        technicianId: radiologyStudies.technicianId,
        status: radiologyStudies.status,
        startedAt: radiologyStudies.startedAt,
        completedAt: radiologyStudies.completedAt,
        equipment: radiologyStudies.equipment,
        notes: radiologyStudies.notes,
        createdAt: radiologyStudies.createdAt,
        orderNumber: clinicalOrders.orderNumber,
        patientId: clinicalOrders.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(radiologyStudies)
      .innerJoin(clinicalOrders, eq(radiologyStudies.orderId, clinicalOrders.id))
      .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
      .where(where)
      .orderBy(radiologyStudies.scheduledAt, desc(radiologyStudies.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(radiologyStudies).where(where),
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

export async function scheduleStudy(
  input: { orderId: string; scheduledAt: string; equipment?: string | null },
  userId: string,
  meta: RequestMeta
) {
  const studyRows = await db
    .select()
    .from(radiologyStudies)
    .where(eq(radiologyStudies.orderId, input.orderId))
    .limit(1);
  if (!studyRows[0]) throw new NotFoundError("Radiology study");
  const existing = studyRows[0];

  if (existing.status === StudyStatus.COMPLETED) {
    throw new ConflictError("Cannot reschedule a completed study");
  }

  const [updated] = await db
    .update(radiologyStudies)
    .set({
      scheduledAt: new Date(input.scheduledAt),
      equipment: input.equipment ?? existing.equipment,
      updatedAt: new Date(),
    })
    .where(eq(radiologyStudies.id, existing.id))
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_STUDY_SCHEDULED",
    module: "radiology",
    entity: "radiology_study",
    entityId: existing.id,
    oldValues: { scheduledAt: existing.scheduledAt },
    newValues: { scheduledAt: updated.scheduledAt, equipment: input.equipment ?? null },
    ...meta,
  });

  return updated;
}

export async function startStudy(studyId: string, userId: string, meta: RequestMeta) {
  const rows = await db
    .select()
    .from(radiologyStudies)
    .where(eq(radiologyStudies.id, studyId))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology study");
  const existing = rows[0];

  if (existing.status !== StudyStatus.SCHEDULED) {
    throw new ConflictError("Only scheduled studies can be started");
  }

  const [updated] = await db
    .update(radiologyStudies)
    .set({
      status: StudyStatus.IN_PROGRESS,
      startedAt: new Date(),
      technicianId: userId,
      updatedAt: new Date(),
    })
    .where(eq(radiologyStudies.id, studyId))
    .returning();

  // Update order to in_progress
  await db
    .update(clinicalOrders)
    .set({ status: OrderStatus.IN_PROGRESS, updatedAt: new Date() })
    .where(eq(clinicalOrders.id, existing.orderId));

  await logAudit({
    userId,
    action: "RADIOLOGY_STUDY_STARTED",
    module: "radiology",
    entity: "radiology_study",
    entityId: studyId,
    oldValues: { status: existing.status },
    newValues: { status: StudyStatus.IN_PROGRESS, startedAt: updated.startedAt },
    ...meta,
  });

  return updated;
}

export async function completeStudy(
  studyId: string,
  notes: string | undefined,
  userId: string,
  meta: RequestMeta
) {
  const rows = await db
    .select()
    .from(radiologyStudies)
    .where(eq(radiologyStudies.id, studyId))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology study");
  const existing = rows[0];

  if (existing.status !== StudyStatus.IN_PROGRESS) {
    throw new ConflictError("Only in-progress studies can be completed");
  }

  const [updated] = await db
    .update(radiologyStudies)
    .set({
      status: StudyStatus.COMPLETED,
      completedAt: new Date(),
      notes: notes ?? existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(radiologyStudies.id, studyId))
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_STUDY_COMPLETED",
    module: "radiology",
    entity: "radiology_study",
    entityId: studyId,
    oldValues: { status: existing.status },
    newValues: { status: StudyStatus.COMPLETED, notes: notes ?? null },
    ...meta,
  });

  return updated;
}

// ─── Reports ─────────────────────────────────────────────────────

export async function createReport(
  input: {
    studyId: string;
    findings: string;
    impressions: string;
    recommendations?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const studyRows = await db
    .select()
    .from(radiologyStudies)
    .where(eq(radiologyStudies.id, input.studyId))
    .limit(1);
  if (!studyRows[0]) throw new NotFoundError("Radiology study");
  const study = studyRows[0];

  if (study.status !== StudyStatus.COMPLETED) {
    throw new ConflictError("Reports can only be created for completed studies");
  }

  const id = randomUUID();
  const [report] = await db
    .insert(radiologyReports)
    .values({
      id,
      studyId: input.studyId,
      findings: input.findings,
      impressions: input.impressions,
      recommendations: input.recommendations ?? null,
      status: ReportStatus.DRAFT,
      radiologistId: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_REPORT_CREATED",
    module: "radiology",
    entity: "radiology_report",
    entityId: id,
    newValues: {
      studyId: input.studyId,
      findings: input.findings,
      impressions: input.impressions,
    },
    ...meta,
  });

  return report;
}

export async function updateReport(
  id: string,
  input: {
    findings?: string;
    impressions?: string;
    recommendations?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  const rows = await db
    .select()
    .from(radiologyReports)
    .where(eq(radiologyReports.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology report");
  const existing = rows[0];

  if (existing.status !== ReportStatus.DRAFT) {
    throw new ConflictError("Only draft reports can be updated");
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.findings !== undefined) updateData.findings = input.findings;
  if (input.impressions !== undefined) updateData.impressions = input.impressions;
  if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;

  const [updated] = await db
    .update(radiologyReports)
    .set(updateData)
    .where(eq(radiologyReports.id, id))
    .returning();

  await logAudit({
    userId,
    action: "RADIOLOGY_REPORT_UPDATED",
    module: "radiology",
    entity: "radiology_report",
    entityId: id,
    oldValues: {
      findings: existing.findings,
      impressions: existing.impressions,
      recommendations: existing.recommendations,
    },
    newValues: {
      findings: updated.findings,
      impressions: updated.impressions,
      recommendations: updated.recommendations,
    },
    ...meta,
  });

  return updated;
}

export async function finalizeReport(id: string, userId: string, meta: RequestMeta) {
  const rows = await db
    .select()
    .from(radiologyReports)
    .where(eq(radiologyReports.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology report");
  const existing = rows[0];

  if (existing.status !== ReportStatus.DRAFT) {
    throw new ConflictError("Only draft reports can be finalized");
  }

  const outcome = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(radiologyReports)
      .set({
        status: ReportStatus.FINALIZED,
        finalizedAt: new Date(),
        finalizedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(radiologyReports.id, id))
      .returning();

    // Complete the clinical order
    const studyRows = await tx
      .select({ orderId: radiologyStudies.orderId })
      .from(radiologyStudies)
      .where(eq(radiologyStudies.id, existing.studyId))
      .limit(1);

    if (studyRows[0]) {
      await tx
        .update(clinicalOrders)
        .set({ status: OrderStatus.COMPLETED, updatedAt: new Date() })
        .where(eq(clinicalOrders.id, studyRows[0].orderId));
    }

    return updated;
  });

  await logAudit({
    userId,
    action: "RADIOLOGY_REPORT_FINALIZED",
    module: "radiology",
    entity: "radiology_report",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: ReportStatus.FINALIZED, finalizedAt: outcome.finalizedAt },
    ...meta,
  });

  return outcome;
}

export async function listReports(opts: {
  status?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [];

  if (opts.status) conditions.push(eq(radiologyReports.status, opts.status));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: radiologyReports.id,
        studyId: radiologyReports.studyId,
        findings: radiologyReports.findings,
        impressions: radiologyReports.impressions,
        recommendations: radiologyReports.recommendations,
        status: radiologyReports.status,
        radiologistId: radiologyReports.radiologistId,
        reportedAt: radiologyReports.reportedAt,
        finalizedAt: radiologyReports.finalizedAt,
        finalizedBy: radiologyReports.finalizedBy,
        createdAt: radiologyReports.createdAt,
        orderId: radiologyStudies.orderId,
        orderNumber: clinicalOrders.orderNumber,
        patientId: clinicalOrders.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
      })
      .from(radiologyReports)
      .innerJoin(radiologyStudies, eq(radiologyReports.studyId, radiologyStudies.id))
      .innerJoin(clinicalOrders, eq(radiologyStudies.orderId, clinicalOrders.id))
      .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
      .where(where)
      .orderBy(desc(radiologyReports.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(radiologyReports).where(where),
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

export async function getReportById(id: string) {
  const rows = await db
    .select({
      id: radiologyReports.id,
      studyId: radiologyReports.studyId,
      findings: radiologyReports.findings,
      impressions: radiologyReports.impressions,
      recommendations: radiologyReports.recommendations,
      status: radiologyReports.status,
      radiologistId: radiologyReports.radiologistId,
      reportedAt: radiologyReports.reportedAt,
      finalizedAt: radiologyReports.finalizedAt,
      finalizedBy: radiologyReports.finalizedBy,
      createdAt: radiologyReports.createdAt,
      updatedAt: radiologyReports.updatedAt,
      orderId: radiologyStudies.orderId,
      orderNumber: clinicalOrders.orderNumber,
      patientId: clinicalOrders.patientId,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientMrn: patients.mrn,
    })
    .from(radiologyReports)
    .innerJoin(radiologyStudies, eq(radiologyReports.studyId, radiologyStudies.id))
    .innerJoin(clinicalOrders, eq(radiologyStudies.orderId, clinicalOrders.id))
    .leftJoin(patients, eq(clinicalOrders.patientId, patients.id))
    .where(eq(radiologyReports.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology report");
  return rows[0];
}

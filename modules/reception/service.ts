import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { encounters, queueEntries, patients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import type { RequestMeta } from "@/types";
import {
  EncounterStatus,
  EncounterType,
  QueueType,
  QueueStatus,
  QueuePriority,
} from "@/lib/types/enums";

export async function createWalkIn(
  input: {
    patientId: string;
    encounterType: string;
    departmentId?: string | null;
    serviceId?: string | null;
    priority?: string;
    reason?: string | null;
  },
  userId: string,
  meta: RequestMeta
) {
  // Verify patient exists
  const patRows = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);
  if (!patRows[0]) throw new NotFoundError("Patient");

  const result = await db.transaction(async (tx) => {
    // Create encounter
    const encounterId = randomUUID();
    const [encounter] = await tx
      .insert(encounters)
      .values({
        id: encounterId,
        patientId: input.patientId,
        type: input.encounterType,
        status: EncounterStatus.REGISTERED,
        departmentId: input.departmentId ?? null,
        notes: input.reason ?? null,
        createdBy: userId,
      })
      .returning();

    // Determine queue type based on encounter type
    let queueType: string = QueueType.RECEPTION;
    if (
      input.encounterType === EncounterType.LABORATORY_ONLY ||
      input.encounterType === EncounterType.RADIOLOGY_ONLY ||
      input.encounterType === EncounterType.PHARMACY_WALK_IN
    ) {
      queueType = QueueType.RECEPTION;
    }

    // Get next queue number
    const maxResult = await tx
      .select({ maxNum: sql<number | null>`MAX(${queueEntries.queueNumber})` })
      .from(queueEntries)
      .where(eq(queueEntries.queueType, queueType));
    const nextNum = (maxResult[0]?.maxNum ?? 0) + 1;

    // Create queue entry
    const queueId = randomUUID();
    const [queueEntry] = await tx
      .insert(queueEntries)
      .values({
        id: queueId,
        queueNumber: nextNum,
        queueType,
        priority: input.priority ?? QueuePriority.NORMAL,
        departmentId: input.departmentId ?? null,
        serviceId: input.serviceId ?? null,
        patientId: input.patientId,
        encounterId,
        status: QueueStatus.WAITING,
        notes: input.reason ?? null,
        createdBy: userId,
      })
      .returning();

    return { encounter, queueEntry };
  });

  await logAudit({
    userId,
    action: "ENCOUNTER_CREATED",
    module: "reception",
    entity: "encounter",
    entityId: result.encounter.id,
    newValues: {
      patientId: input.patientId,
      type: input.encounterType,
      walkIn: true,
    },
    ...meta,
  });

  await logAudit({
    userId,
    action: "QUEUE_ENQUEUED",
    module: "reception",
    entity: "queue_entry",
    entityId: result.queueEntry.id,
    newValues: {
      queueNumber: result.queueEntry.queueNumber,
      queueType: result.queueEntry.queueType,
      encounterId: result.encounter.id,
    },
    ...meta,
  });

  return result;
}

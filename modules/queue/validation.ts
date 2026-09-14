import { z } from "zod";
import { paginationSchema, idSchema, queueTypeSchema, queuePrioritySchema, queueStatusSchema } from "@/lib/validation";

export const listQueueEntriesQuerySchema = paginationSchema.extend({
  queueType: queueTypeSchema,
  status: queueStatusSchema.optional(),
  departmentId: idSchema.optional(),
});

export const createQueueEntrySchema = z.object({
  queueType: queueTypeSchema,
  patientId: idSchema,
  encounterId: idSchema,
  departmentId: idSchema.optional().nullable(),
  serviceId: idSchema.optional().nullable(),
  priority: queuePrioritySchema.optional(),
  notes: z.string().optional().nullable(),
});

export const callQueueEntrySchema = z.object({
  staffId: idSchema,
});

export const updateQueuePrioritySchema = z.object({
  priority: queuePrioritySchema,
});

import { z } from "zod";
import { idSchema, encounterTypeSchema, queuePrioritySchema } from "@/lib/validation";

export const createWalkInSchema = z.object({
  patientId: idSchema,
  encounterType: encounterTypeSchema,
  departmentId: idSchema.optional().nullable(),
  serviceId: idSchema.optional().nullable(),
  priority: queuePrioritySchema.optional(),
  reason: z.string().max(500).optional().nullable(),
});

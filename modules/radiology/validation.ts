import { z } from "zod";
import { paginationSchema, idSchema } from "@/lib/validation";

export const listModalitiesQuerySchema = paginationSchema;

export const createModalitySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
});

export const listProceduresQuerySchema = paginationSchema.extend({
  modalityId: idSchema.optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const createProcedureSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  modalityId: idSchema,
  bodyPart: z.string().max(100).optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  prepInstructions: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const updateProcedureSchema = createProcedureSchema.partial();

export const createRadiologyOrderSchema = z.object({
  patientId: idSchema,
  encounterId: idSchema,
  consultationId: idSchema.optional().nullable(),
  orderingProviderId: idSchema,
  departmentId: idSchema.optional().nullable(),
  priority: z.enum(["normal", "urgent", "emergency"]).optional(),
  clinicalNotes: z.string().optional().nullable(),
  procedureId: idSchema,
  clinicalQuestion: z.string().optional().nullable(),
});

export const listRadiologyOrdersQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
});

export const scheduleStudySchema = z.object({
  scheduledAt: z.string().min(1),
  equipment: z.string().max(200).optional().nullable(),
});

export const createReportSchema = z.object({
  studyId: idSchema,
  findings: z.string().min(1),
  impressions: z.string().min(1),
  recommendations: z.string().optional().nullable(),
});

export const updateReportSchema = z.object({
  findings: z.string().min(1).optional(),
  impressions: z.string().min(1).optional(),
  recommendations: z.string().optional().nullable(),
});

export const listReportsQuerySchema = paginationSchema.extend({
  status: z.enum(["draft", "finalized"]).optional(),
});

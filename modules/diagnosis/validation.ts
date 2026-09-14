import { z } from "zod";
import { idSchema, diagnosisTypeSchema } from "@/lib/validation";

export const createDiagnosisSchema = z.object({
  consultationId: idSchema,
  encounterId: idSchema,
  diagnosisCodeId: idSchema.optional().nullable(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: diagnosisTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const updateDiagnosisSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
  type: diagnosisTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
  status: z.enum(["active", "entered-in-error", "resolved"]).optional(),
  notes: z.string().optional().nullable(),
});

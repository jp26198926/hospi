import { z } from "zod";
import { idSchema, triageCategorySchema } from "@/lib/validation";

export const createTriageRecordSchema = z.object({
  encounterId: idSchema,
  temperature: z.number().min(20).max(50).optional().nullable(),
  bpSystolic: z.number().int().min(30).max(300).optional().nullable(),
  bpDiastolic: z.number().int().min(10).max(200).optional().nullable(),
  heartRate: z.number().int().min(10).max(300).optional().nullable(),
  respiratoryRate: z.number().int().min(4).max(80).optional().nullable(),
  oxygenSaturation: z.number().min(0).max(100).optional().nullable(),
  weight: z.number().min(0).max(500).optional().nullable(),
  height: z.number().min(0).max(300).optional().nullable(),
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  chiefComplaint: z.string().max(1000).optional().nullable(),
  allergies: z.string().max(1000).optional().nullable(),
  triageCategory: triageCategorySchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

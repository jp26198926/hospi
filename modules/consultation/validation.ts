import { z } from "zod";
import { idSchema } from "@/lib/validation";

export const createConsultationSchema = z.object({
  encounterId: idSchema,
  patientId: idSchema,
  providerId: idSchema,
  chiefComplaint: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  examination: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
});

export const updateConsultationSchema = z.object({
  chiefComplaint: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  examination: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
});

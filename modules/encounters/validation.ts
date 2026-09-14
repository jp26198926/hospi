import { z } from "zod";
import { paginationSchema, idSchema, encounterTypeSchema, encounterStatusSchema } from "@/lib/validation";

export const listEncountersQuerySchema = paginationSchema.extend({
  patientId: idSchema.optional(),
  status: encounterStatusSchema.optional(),
  type: encounterTypeSchema.optional(),
  departmentId: idSchema.optional(),
  date: z.string().optional(),
});

export const createEncounterSchema = z.object({
  patientId: idSchema,
  type: encounterTypeSchema,
  departmentId: idSchema.optional().nullable(),
  attendingProviderId: idSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateEncounterSchema = z.object({
  status: encounterStatusSchema.optional(),
  departmentId: idSchema.optional().nullable(),
  attendingProviderId: idSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

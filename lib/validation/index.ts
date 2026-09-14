import { z } from "zod";

export const idSchema = z.string().min(1);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const sexSchema = z.enum(["male", "female", "other", "unknown"]);
export const bloodTypeSchema = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export const encounterTypeSchema = z.enum([
  "outpatient", "emergency", "inpatient", "follow_up",
  "laboratory_only", "radiology_only", "pharmacy_walk_in", "consultation",
]);
export const encounterStatusSchema = z.enum([
  "registered", "waiting", "in_triage", "ready", "in_consultation", "completed", "cancelled",
]);
export const appointmentStatusSchema = z.enum([
  "scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show",
]);
export const queueTypeSchema = z.enum(["reception", "triage", "consultation"]);
export const queuePrioritySchema = z.enum(["normal", "urgent", "emergency"]);
export const queueStatusSchema = z.enum(["waiting", "called", "in_progress", "completed", "cancelled"]);
export const triageCategorySchema = z.enum(["emergency", "urgent", "semi-urgent", "non-urgent", "stable"]);
export const consultationStatusSchema = z.enum(["draft", "finalized"]);
export const diagnosisTypeSchema = z.enum(["clinical", "provisional", "admitting", "discharge", "final"]);

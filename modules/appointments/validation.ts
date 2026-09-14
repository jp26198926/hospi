import { z } from "zod";
import { paginationSchema, idSchema, appointmentStatusSchema } from "@/lib/validation";

export const listAppointmentsQuerySchema = paginationSchema.extend({
  date: z.string().optional(),
  staffId: idSchema.optional(),
  patientId: idSchema.optional(),
  status: appointmentStatusSchema.optional(),
  departmentId: idSchema.optional(),
});

export const createAppointmentSchema = z.object({
  patientId: idSchema,
  staffId: idSchema.optional().nullable(),
  departmentId: idSchema,
  serviceId: idSchema.optional().nullable(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAppointmentSchema = z.object({
  staffId: idSchema.optional().nullable(),
  departmentId: idSchema.optional(),
  serviceId: idSchema.optional().nullable(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(500),
});

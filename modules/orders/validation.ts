import { z } from "zod";
import { idSchema, paginationSchema, orderTypeSchema, orderStatusSchema, queuePrioritySchema } from "@/lib/validation";

export const listOrdersQuerySchema = paginationSchema.extend({
  type: orderTypeSchema.optional(),
  status: orderStatusSchema.optional(),
  patientId: idSchema.optional(),
  encounterId: idSchema.optional(),
  priority: queuePrioritySchema.optional(),
});

const labOrderChildSchema = z.object({
  panelId: idSchema.optional().nullable(),
  testIds: z.array(idSchema).min(1),
  notes: z.string().optional().nullable(),
});

const radiologyOrderChildSchema = z.object({
  procedureId: idSchema,
  clinicalQuestion: z.string().optional().nullable(),
});

const medicationItemSchema = z.object({
  medicationId: idSchema,
  dose: z.string().min(1),
  route: z.string().min(1),
  frequency: z.string().min(1),
  durationDays: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  instructions: z.string().optional().nullable(),
});

const medicationOrderChildSchema = z.object({
  items: z.array(medicationItemSchema).min(1),
  notes: z.string().optional().nullable(),
});

export const createOrderSchema = z.object({
  type: z.enum(["laboratory", "radiology", "medication"]),
  patientId: idSchema,
  encounterId: idSchema,
  consultationId: idSchema.optional().nullable(),
  orderingProviderId: idSchema,
  departmentId: idSchema.optional().nullable(),
  priority: queuePrioritySchema.optional(),
  clinicalNotes: z.string().optional().nullable(),
  lab: labOrderChildSchema.optional(),
  radiology: radiologyOrderChildSchema.optional(),
  medication: medicationOrderChildSchema.optional(),
});

export const updateOrderSchema = z.object({
  priority: queuePrioritySchema.optional(),
  clinicalNotes: z.string().optional().nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const rejectOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

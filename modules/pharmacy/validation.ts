import { z } from "zod";
import { paginationSchema, idSchema } from "@/lib/validation";

export const listMedicationsQuerySchema = paginationSchema.extend({
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const createMedicationSchema = z.object({
  genericName: z.string().min(1).max(200),
  brandName: z.string().max(200).optional().nullable(),
  dosageForm: z.string().min(1).max(100),
  strength: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  active: z.boolean().optional(),
});

export const updateMedicationSchema = createMedicationSchema.partial();

export const receiveBatchSchema = z.object({
  medicationId: idSchema,
  batchNumber: z.string().min(1).max(100),
  expirationDate: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  supplierId: idSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const adjustStockSchema = z.object({
  batchId: idSchema,
  quantityChange: z.coerce.number().int().refine((n) => n !== 0, "Quantity change cannot be zero"),
  reason: z.string().min(1).max(500),
});

export const transferStockSchema = z.object({
  batchId: idSchema,
  quantity: z.coerce.number().int().positive(),
  destination: z.string().min(1).max(200),
  notes: z.string().optional().nullable(),
});

export const markExpiredSchema = z.object({
  batchId: idSchema,
  quantity: z.coerce.number().int().positive().optional(),
});

export const returnStockSchema = z.object({
  batchId: idSchema,
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(500),
  dispensingId: idSchema.optional().nullable(),
});

export const listStockMovementsQuerySchema = paginationSchema.extend({
  medicationId: idSchema.optional(),
  batchId: idSchema.optional(),
  type: z.enum(["IN", "OUT", "RETURN", "ADJUSTMENT", "TRANSFER", "EXPIRED"]).optional(),
});

export const listBatchesQuerySchema = paginationSchema.extend({
  medicationId: idSchema.optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(150).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

export const listPrescriptionsQuerySchema = paginationSchema.extend({
  status: z.enum(["pending", "dispensed", "cancelled"]).optional(),
  patientId: idSchema.optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: idSchema,
  encounterId: idSchema,
  prescriberId: idSchema,
  consultationId: idSchema.optional().nullable(),
  departmentId: idSchema.optional().nullable(),
  priority: z.enum(["normal", "urgent", "emergency"]).optional(),
  clinicalNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        medicationId: idSchema,
        dose: z.string().min(1),
        route: z.string().min(1),
        frequency: z.string().min(1),
        durationDays: z.coerce.number().int().positive().optional().nullable(),
        quantity: z.coerce.number().int().positive(),
        instructions: z.string().optional().nullable(),
      })
    )
    .min(1),
});

export const cancelPrescriptionSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const dispensePrescriptionSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const createWalkInSaleSchema = z.object({
  patientId: idSchema.optional().nullable(),
  encounterId: idSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        medicationId: idSchema,
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().min(0).optional(),
      })
    )
    .min(1),
});

export const listDispensingsQuerySchema = paginationSchema.extend({
  status: z.enum(["pending", "completed"]).optional(),
  patientId: idSchema.optional(),
});

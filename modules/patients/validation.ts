import { z } from "zod";
import { paginationSchema, sexSchema, bloodTypeSchema, idSchema } from "@/lib/validation";

export const listPatientsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "deceased", "merged"]).optional(),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1).max(100),
  suffix: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().min(1),
  sex: sexSchema,
  phone: z.string().max(30).optional().nullable(),
  email: z.email().optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactPhone: z.string().max(30).optional().nullable(),
  emergencyContactRelationship: z.string().max(50).optional().nullable(),
  bloodType: bloodTypeSchema.optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalAlerts: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const mergePatientsSchema = z.object({
  primaryId: idSchema,
  secondaryId: idSchema,
  reason: z.string().min(1).max(500),
});

export const searchPatientsQuerySchema = z.object({
  q: z.string().min(1),
});

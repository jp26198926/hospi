import { z } from "zod";
import { paginationSchema, idSchema } from "@/lib/validation";

export const listTestCategoriesQuerySchema = paginationSchema;

export const createTestCategorySchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
});

export const listTestsQuerySchema = paginationSchema.extend({
  categoryId: idSchema.optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const createTestSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  categoryId: idSchema.optional().nullable(),
  specimenType: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  referenceRangeLow: z.coerce.number().optional().nullable(),
  referenceRangeHigh: z.coerce.number().optional().nullable(),
  referenceRangeText: z.string().max(200).optional().nullable(),
  active: z.boolean().optional(),
});

export const updateTestSchema = createTestSchema.partial();

export const listPanelsQuerySchema = paginationSchema;

export const createPanelSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  testIds: z.array(idSchema).min(1),
  active: z.boolean().optional(),
});

export const updatePanelSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  testIds: z.array(idSchema).min(1).optional(),
  active: z.boolean().optional(),
});

export const createSpecimenTypeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  handlingNotes: z.string().optional().nullable(),
});

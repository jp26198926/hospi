import { z } from "zod";
import { paginationSchema } from "@/lib/validation";

export const listDepartmentsQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
});

export const listServicesQuerySchema = z.object({
  departmentId: z.string().min(1).optional(),
  activeOnly: z.coerce.boolean().optional(),
});

export const listDiagnosisCodesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  system: z.string().optional(),
  activeOnly: z.coerce.boolean().optional(),
});

import { z } from "zod";

export const listStaffQuerySchema = z.object({
  departmentId: z.string().min(1).optional(),
  activeOnly: z.coerce.boolean().optional(),
});

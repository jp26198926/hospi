import { z } from "zod";
import { idSchema, paginationSchema } from "@/lib/validation";

export const listDocumentsQuerySchema = paginationSchema.extend({
  ownerEntity: z.string().min(1),
  ownerId: idSchema,
});

export const getDocumentByIdSchema = z.object({
  id: idSchema,
});

import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import * as radService from "@/modules/radiology/service";
import { paginationSchema } from "@/lib/validation";
import { z } from "zod";

const listStudiesQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
});

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listStudiesQuerySchema.parse({
    status: params.get("status") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await radService.listStudies(query);
  return successResponse(data);
});

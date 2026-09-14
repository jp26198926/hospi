import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as labService from "@/modules/laboratory/service";
import { z } from "zod";
import { idSchema, paginationSchema } from "@/lib/validation";

const enterResultsSchema = z.object({
  labOrderId: idSchema,
  specimenId: idSchema.optional(),
  results: z
    .array(
      z.object({
        testId: idSchema,
        value: z.string().min(1),
        unit: z.string().optional(),
        isAbnormal: z.boolean().optional(),
        abnormalFlag: z.string().optional(),
      })
    )
    .min(1),
});

const listResultsQuerySchema = paginationSchema.extend({
  labOrderId: idSchema.optional(),
  status: z.string().optional(),
});

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.LABORATORY_VIEW);
  const params = new URL(req.url).searchParams;
  const labOrderId = params.get("labOrderId");
  if (!labOrderId) {
    // If no labOrderId, return empty paginated result
    return successResponse({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  }
  const detail = await labService.getLabOrderDetail(labOrderId);
  return successResponse({ items: detail.results, total: detail.results.length });
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_RESULT);
  const body = enterResultsSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await labService.enterResults(body, session.user.id, meta);
  return successResponse(data, 201);
});

import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/laboratory/catalog-service";
import { listTestsQuerySchema, createTestSchema } from "@/modules/laboratory/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.LABORATORY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listTestsQuerySchema.parse({
    categoryId: params.get("categoryId") ?? undefined,
    active: params.get("active") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await catalogService.listTests(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_CREATE);
  const body = createTestSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.createTest(body, session.user.id, meta);
  return successResponse(data, 201);
});

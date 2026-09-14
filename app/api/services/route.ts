import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requireSession } from "@/lib/auth/session";
import * as masterService from "@/modules/master/service";
import { listServicesQuerySchema } from "@/modules/master/validation";

export const GET = executeRoute(async (req) => {
  await requireSession();
  const params = new URL(req.url).searchParams;
  const query = listServicesQuerySchema.parse({
    departmentId: params.get("departmentId") ?? undefined,
    activeOnly: params.get("activeOnly") ?? undefined,
  });
  const data = await masterService.listServices(query);
  return successResponse(data);
});

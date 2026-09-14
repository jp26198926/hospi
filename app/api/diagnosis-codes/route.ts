import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requireSession } from "@/lib/auth/session";
import * as masterService from "@/modules/master/service";
import { listDiagnosisCodesQuerySchema } from "@/modules/master/validation";

export const GET = executeRoute(async (req) => {
  await requireSession();
  const params = new URL(req.url).searchParams;
  const query = listDiagnosisCodesQuerySchema.parse({
    search: params.get("search") ?? undefined,
    system: params.get("system") ?? undefined,
    activeOnly: params.get("activeOnly") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await masterService.listDiagnosisCodes(query);
  return successResponse(data);
});

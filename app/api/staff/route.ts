import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requireSession } from "@/lib/auth/session";
import * as staffService from "@/modules/staff/service";
import { listStaffQuerySchema } from "@/modules/staff/validation";

export const GET = executeRoute(async (req) => {
  await requireSession();
  const params = new URL(req.url).searchParams;
  const query = listStaffQuerySchema.parse({
    departmentId: params.get("departmentId") ?? undefined,
    activeOnly: params.get("activeOnly") ?? undefined,
  });
  const data = await staffService.listStaff(query);
  return successResponse(data);
});

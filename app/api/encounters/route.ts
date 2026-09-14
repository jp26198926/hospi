import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as encounterService from "@/modules/encounters/service";
import { listEncountersQuerySchema, createEncounterSchema } from "@/modules/encounters/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.ENCOUNTER_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listEncountersQuerySchema.parse({
    patientId: params.get("patientId") ?? undefined,
    status: params.get("status") ?? undefined,
    type: params.get("type") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    date: params.get("date") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await encounterService.listEncounters(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.ENCOUNTER_CREATE);
  const body = createEncounterSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await encounterService.createEncounter(body, session.user.id, meta);
  return successResponse(data, 201);
});

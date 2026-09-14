import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/radiology/catalog-service";
import { updateProcedureSchema } from "@/modules/radiology/validation";
import { db } from "@/lib/db";
import { radiologyProcedures, imagingModalities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const id = extractId(req);
  const rows = await db
    .select({
      id: radiologyProcedures.id,
      code: radiologyProcedures.code,
      name: radiologyProcedures.name,
      modalityId: radiologyProcedures.modalityId,
      bodyPart: radiologyProcedures.bodyPart,
      durationMinutes: radiologyProcedures.durationMinutes,
      prepInstructions: radiologyProcedures.prepInstructions,
      active: radiologyProcedures.active,
      createdAt: radiologyProcedures.createdAt,
      updatedAt: radiologyProcedures.updatedAt,
      modalityName: imagingModalities.name,
    })
    .from(radiologyProcedures)
    .leftJoin(imagingModalities, eq(radiologyProcedures.modalityId, imagingModalities.id))
    .where(eq(radiologyProcedures.id, id))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Radiology procedure");
  return successResponse(rows[0]);
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_ORDER);
  const id = extractId(req);
  const body = updateProcedureSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.updateProcedure(id, body, session.user.id, meta);
  return successResponse(data);
});

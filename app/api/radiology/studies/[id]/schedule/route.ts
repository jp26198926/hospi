import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as radService from "@/modules/radiology/service";
import { scheduleStudySchema } from "@/modules/radiology/validation";
import { db } from "@/lib/db";
import { radiologyStudies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";

function extractStudyId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_SCHEDULE);
  const studyId = extractStudyId(req);
  // Resolve orderId from studyId
  const studyRows = await db
    .select({ orderId: radiologyStudies.orderId })
    .from(radiologyStudies)
    .where(eq(radiologyStudies.id, studyId))
    .limit(1);
  if (!studyRows[0]) throw new NotFoundError("Radiology study");
  const body = scheduleStudySchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await radService.scheduleStudy(
    { orderId: studyRows[0].orderId, scheduledAt: body.scheduledAt, equipment: body.equipment ?? undefined },
    session.user.id,
    meta
  );
  return successResponse(data);
});

import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/laboratory/catalog-service";
import { updateTestSchema } from "@/modules/laboratory/validation";
import { db } from "@/lib/db";
import { labTests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.LABORATORY_VIEW);
  const id = extractId(req);
  const rows = await db.select().from(labTests).where(eq(labTests.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab test");
  const t = rows[0];
  return successResponse({
    ...t,
    referenceRangeLow: t.referenceRangeLow != null ? Number(t.referenceRangeLow) : null,
    referenceRangeHigh: t.referenceRangeHigh != null ? Number(t.referenceRangeHigh) : null,
  });
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_CREATE);
  const id = extractId(req);
  const body = updateTestSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.updateTest(id, body, session.user.id, meta);
  return successResponse(data);
});

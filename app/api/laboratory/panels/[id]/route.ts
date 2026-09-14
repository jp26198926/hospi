import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/laboratory/catalog-service";
import { updatePanelSchema } from "@/modules/laboratory/validation";
import { db } from "@/lib/db";
import { labPanels, labPanelTests, labTests } from "@/db/schema";
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
  const rows = await db.select().from(labPanels).where(eq(labPanels.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Lab panel");
  const tests = await db
    .select({
      panelId: labPanelTests.panelId,
      testId: labPanelTests.testId,
      testCode: labTests.code,
      testName: labTests.name,
    })
    .from(labPanelTests)
    .innerJoin(labTests, eq(labPanelTests.testId, labTests.id))
    .where(eq(labPanelTests.panelId, id));
  return successResponse({ ...rows[0], tests });
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_CREATE);
  const id = extractId(req);
  const body = updatePanelSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.updatePanel(id, body, session.user.id, meta);
  return successResponse(data);
});

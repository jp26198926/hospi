import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as labService from "@/modules/laboratory/service";
import { z } from "zod";
import { idSchema } from "@/lib/validation";

const collectSpecimenSchema = z.object({
  specimenTypeId: idSchema.optional(),
  notes: z.string().optional().nullable(),
});

function extractOrderId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_PROCESS);
  const orderId = extractOrderId(req);
  const body = collectSpecimenSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await labService.collectSpecimen(
    { labOrderId: orderId, specimenTypeId: body.specimenTypeId, notes: body.notes ?? undefined },
    session.user.id,
    meta
  );
  return successResponse(data, 201);
});

import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as pharmacyService from "@/modules/pharmacy/service";
import { cancelPrescriptionSchema } from "@/modules/pharmacy/validation";

function extractRxId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_DISPENSE);
  const id = extractRxId(req);
  const body = cancelPrescriptionSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await pharmacyService.cancelPrescription(id, body.reason, session.user.id, meta);
  return successResponse(data);
});

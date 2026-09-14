import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as pharmacyService from "@/modules/pharmacy/service";
import { listDispensingsQuerySchema, dispensePrescriptionSchema, createWalkInSaleSchema } from "@/modules/pharmacy/validation";
import { z } from "zod";

const dispenseBodySchema = z.object({
  prescriptionId: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PHARMACY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listDispensingsQuerySchema.parse({
    status: params.get("status") ?? undefined,
    patientId: params.get("patientId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await pharmacyService.listDispensings(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_DISPENSE);
  const raw = await req.json();
  const meta = getRequestMeta(req);

  // Distinguish walk-in sale vs prescription dispense
  if (raw.items && Array.isArray(raw.items)) {
    // Walk-in sale
    const body = createWalkInSaleSchema.parse(raw);
    const data = await pharmacyService.createWalkInSale(body, session.user.id, meta);
    return successResponse(data, 201);
  }

  // Prescription dispense
  const body = dispenseBodySchema.parse(raw);
  const data = await pharmacyService.dispensePrescription(body, session.user.id, meta);
  return successResponse(data, 201);
});

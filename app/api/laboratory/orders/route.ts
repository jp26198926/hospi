import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as labService from "@/modules/laboratory/service";
import { paginationSchema } from "@/lib/validation";
import { z } from "zod";
import { createOrderSchema } from "@/modules/orders/validation";
import * as orderService from "@/modules/orders/service";

const listLabOrdersQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
});

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.LABORATORY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listLabOrdersQuerySchema.parse({
    status: params.get("status") ?? undefined,
    priority: params.get("priority") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await labService.listLabOrders(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_CREATE);
  const raw = await req.json();
  // Force type to laboratory
  const body = createOrderSchema.parse({ ...raw, type: "laboratory" });
  const meta = getRequestMeta(req);
  const data = await orderService.createOrder(body, session.user.id, meta);
  return successResponse(data, 201);
});

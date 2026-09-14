import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as orderService from "@/modules/orders/service";
import { listOrdersQuerySchema, createOrderSchema } from "@/modules/orders/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.ORDER_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listOrdersQuerySchema.parse({
    type: params.get("type") ?? undefined,
    status: params.get("status") ?? undefined,
    patientId: params.get("patientId") ?? undefined,
    encounterId: params.get("encounterId") ?? undefined,
    priority: params.get("priority") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await orderService.listOrders(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.ORDER_CREATE);
  const body = createOrderSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await orderService.createOrder(body, session.user.id, meta);
  return successResponse(data, 201);
});

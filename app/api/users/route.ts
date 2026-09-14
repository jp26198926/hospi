import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { logAudit, getRequestMeta } from "@/lib/audit";

export const GET = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.USER_VIEW);

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user);

  const meta = getRequestMeta(req);
  await logAudit({
    userId: session.user.id,
    action: "USER_LIST_VIEWED",
    module: "user",
    ...meta,
  });

  return successResponse(users);
});

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles, rolePermissions, permissions } from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/classes";
import { getSession } from "@/lib/auth/session";
import type { PermissionKey } from "./constants";

export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));
  return new Set(rows.map((r) => r.key));
}

export async function hasPermission(
  userId: string,
  permission: PermissionKey
): Promise<boolean> {
  const perms = await getUserPermissionKeys(userId);
  return perms.has(permission);
}

export async function requirePermission(permission: PermissionKey) {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const ok = await hasPermission(session.user.id, permission);
  if (!ok) throw new ForbiddenError(`Missing permission: ${permission}`);
  return session;
}

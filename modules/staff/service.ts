import { db } from "@/lib/db";
import { staffProfiles } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/classes";

export async function listStaff(opts?: { departmentId?: string; activeOnly?: boolean }) {
  const conditions = [];
  if (opts?.departmentId) conditions.push(eq(staffProfiles.departmentId, opts.departmentId));
  if (opts?.activeOnly) conditions.push(eq(staffProfiles.active, true));
  return db
    .select()
    .from(staffProfiles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(staffProfiles.lastName), asc(staffProfiles.firstName));
}

export async function getStaffByUserId(userId: string) {
  const rows = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId))
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Staff profile");
  return rows[0];
}

import { db } from "@/lib/db";
import { departments, services, diagnosisCodes } from "@/db/schema";
import { eq, and, or, like, count, asc } from "drizzle-orm";

export async function listDepartments(opts?: { activeOnly?: boolean }) {
  const conditions = opts?.activeOnly ? [eq(departments.active, true)] : [];
  return db
    .select()
    .from(departments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(departments.name));
}

export async function listServices(opts?: { departmentId?: string; activeOnly?: boolean }) {
  const conditions = [];
  if (opts?.departmentId) conditions.push(eq(services.departmentId, opts.departmentId));
  if (opts?.activeOnly) conditions.push(eq(services.active, true));
  return db
    .select()
    .from(services)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(services.name));
}

export async function listDiagnosisCodes(opts?: {
  search?: string;
  system?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (opts?.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(or(like(diagnosisCodes.code, pattern), like(diagnosisCodes.name, pattern)));
  }
  if (opts?.system) conditions.push(eq(diagnosisCodes.system, opts.system));
  if (opts?.activeOnly) conditions.push(eq(diagnosisCodes.active, true));

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(diagnosisCodes)
      .where(where)
      .orderBy(asc(diagnosisCodes.code))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(diagnosisCodes).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

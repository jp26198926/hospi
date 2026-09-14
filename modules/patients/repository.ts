import { db } from "@/lib/db";
import { patients } from "@/db/schema";
import { eq, and, or, like, isNull, sql, desc, count, asc } from "drizzle-orm";

export async function findPatientById(id: string) {
  const rows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPatientByMrn(mrn: string) {
  const rows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.mrn, mrn), isNull(patients.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMrn(): Promise<string> {
  const result = await db
    .select({ maxMrn: sql<string | null>`MAX(${patients.mrn})` })
    .from(patients);
  const maxMrn = result[0]?.maxMrn;
  let next = 1;
  if (maxMrn) {
    const match = maxMrn.match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `MRN-${String(next).padStart(6, "0")}`;
}

export async function searchPatientRows(q: string, limit = 10) {
  const pattern = `%${q}%`;
  return db
    .select({
      id: patients.id,
      mrn: patients.mrn,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dateOfBirth: patients.dateOfBirth,
      sex: patients.sex,
      phone: patients.phone,
    })
    .from(patients)
    .where(
      and(
        isNull(patients.deletedAt),
        eq(patients.status, "active"),
        or(
          like(patients.mrn, pattern),
          like(patients.firstName, pattern),
          like(patients.lastName, pattern),
          like(patients.phone, pattern)
        )
      )
    )
    .orderBy(asc(patients.lastName), asc(patients.firstName))
    .limit(limit);
}

export async function paginatePatients(opts: {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [isNull(patients.deletedAt)];

  if (opts.status) {
    conditions.push(eq(patients.status, opts.status));
  }
  if (opts.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        like(patients.mrn, pattern),
        like(patients.firstName, pattern),
        like(patients.lastName, pattern),
        like(patients.phone, pattern)
      )!
    );
  }

  const where = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(patients)
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(patients).where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return {
    items,
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

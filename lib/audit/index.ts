import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { auditLogs } from "@/db/schema";

interface AuditInput {
  userId?: string | null;
  action: string;
  module: string;
  entity?: string;
  entityId?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      module: input.module,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

export function getRequestMeta(req: Request) {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

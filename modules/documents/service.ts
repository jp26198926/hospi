import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { NotFoundError, ValidationError, AppError } from "@/lib/errors/classes";
import { logAudit } from "@/lib/audit";
import { isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";
import type { RequestMeta } from "@/types";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function resourceTypeForMime(mime: string): "image" | "raw" {
  return mime.startsWith("image/") ? "image" : "raw";
}

export async function uploadDocument(
  input: {
    file: File;
    filename: string;
    mimeType: string;
    ownerEntity: string;
    ownerId: string;
  },
  userId: string,
  meta: RequestMeta
) {
  if (!isCloudinaryConfigured()) {
    throw new AppError("CONFIGURATION_ERROR", "Cloudinary is not configured.", 500);
  }

  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new ValidationError(`Unsupported file type: ${input.mimeType}`);
  }

  if (input.file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File size exceeds the 10MB limit.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());

  const uploaded = await uploadBuffer(buffer, {
    folder: `hospi/${input.ownerEntity}`,
    resourceType: resourceTypeForMime(input.mimeType),
  });

  const id = randomUUID();
  const [doc] = await db
    .insert(documents)
    .values({
      id,
      publicId: uploaded.publicId,
      secureUrl: uploaded.secureUrl,
      resourceType: uploaded.resourceType,
      mimeType: input.mimeType,
      originalFilename: input.filename,
      size: uploaded.bytes,
      ownerEntity: input.ownerEntity,
      ownerId: input.ownerId,
      uploadedBy: userId,
    })
    .returning();

  await logAudit({
    userId,
    action: "DOCUMENT_UPLOADED",
    module: "documents",
    entity: "document",
    entityId: id,
    newValues: {
      ownerEntity: input.ownerEntity,
      ownerId: input.ownerId,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      size: uploaded.bytes,
    },
    ...meta,
  });

  return doc;
}

export async function listDocumentsByOwner(ownerEntity: string, ownerId: string) {
  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerEntity, ownerEntity), eq(documents.ownerId, ownerId)))
      .orderBy(desc(documents.createdAt)),
    db
      .select({ value: count() })
      .from(documents)
      .where(and(eq(documents.ownerEntity, ownerEntity), eq(documents.ownerId, ownerId))),
  ]);

  const total = totalResult[0]?.value ?? 0;
  return { items, total };
}

export async function getDocumentById(id: string) {
  const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError("Document");
  return rows[0];
}

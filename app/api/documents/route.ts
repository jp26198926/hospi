import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as documentService from "@/modules/documents/service";
import { listDocumentsQuerySchema } from "@/modules/documents/validation";
import { ValidationError } from "@/lib/errors/classes";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.DOCUMENT_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listDocumentsQuerySchema.parse({
    ownerEntity: params.get("ownerEntity") ?? undefined,
    ownerId: params.get("ownerId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await documentService.listDocumentsByOwner(query.ownerEntity, query.ownerId);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.DOCUMENT_UPLOAD);
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("file field is required");
  }
  const ownerEntity = formData.get("ownerEntity");
  const ownerId = formData.get("ownerId");
  if (typeof ownerEntity !== "string" || !ownerEntity) {
    throw new ValidationError("ownerEntity field is required");
  }
  if (typeof ownerId !== "string" || !ownerId) {
    throw new ValidationError("ownerId field is required");
  }
  const filename = formData.get("filename");
  const meta = getRequestMeta(req);
  const data = await documentService.uploadDocument(
    {
      file,
      filename: typeof filename === "string" && filename ? filename : file.name,
      mimeType: file.type,
      ownerEntity,
      ownerId,
    },
    session.user.id,
    meta
  );
  return successResponse(data, 201);
});

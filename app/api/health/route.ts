import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";

export const GET = executeRoute(async () => {
  return successResponse({ status: "ok", timestamp: new Date().toISOString() });
});

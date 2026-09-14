import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors/api";

export function executeRoute<T = unknown>(
  handler: (req: Request) => Promise<NextResponse<T>>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

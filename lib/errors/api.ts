import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./classes";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(code: string, message: string, status = 500) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status);
  }
  if (error instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", "Invalid input.", 400);
  }
  console.error("[api] Unhandled error:", error);
  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}

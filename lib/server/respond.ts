/**
 * API envelopes / API 回應格式 (BUILD_PLAN §19)
 *
 * Success: {data}. Failure: {error:{code, message, retryable}}.
 * The frontend localizes from the stable `code`; raw provider errors and
 * secrets are never returned to the browser.
 */

import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/contracts";
import { ERROR_STATUS, RETRYABLE_CODES } from "@/lib/contracts";
import { ApiFault } from "@/lib/server/fault";

export { ApiFault };

export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ data });
}

export function fail(code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json(
    { error: { code, message, retryable: RETRYABLE_CODES.has(code) } },
    { status: ERROR_STATUS[code] },
  );
}

export function faultToResponse(err: unknown): NextResponse {
  if (err instanceof ApiFault) return fail(err.code, err.message);
  const message = err instanceof Error ? err.message : "Unexpected error";
  // Never leak provider internals to the browser.
  console.error("[mkk] unhandled route error:", err);
  return fail("internal_error", message);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiFault("invalid_input", "Request body must be valid JSON");
  }
}

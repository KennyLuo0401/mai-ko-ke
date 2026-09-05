import type { ApiErrorCode } from "@/lib/contracts";

/**
 * Short-circuits a route with a stable error code.
 * Deliberately free of Next-specific imports so game logic stays unit-testable.
 */
export class ApiFault extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiFault";
    this.code = code;
  }
}

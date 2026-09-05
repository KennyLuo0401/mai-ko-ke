import crypto from "node:crypto";
import { ApiFault } from "@/lib/server/fault";

/**
 * Who may open a room / 誰可以開房
 *
 * Joining is open by design — you hand out a six-digit code and people sit
 * down. Creating is not: every room costs two model calls, so an ungated
 * deployment lets anyone with the link spend the owner's budget, and fill the
 * database, without ever playing.
 *
 * When `MKK_HOST_KEY` is unset the check is skipped entirely, so local
 * development and the test suite stay frictionless. Set it in any deployment
 * whose URL is shared.
 *
 * 加入是開放的；開房不是。未設定 MKK_HOST_KEY 時不啟用，方便本機開發。
 */

export function hostKeyRequired(): boolean {
  return Boolean(process.env.MKK_HOST_KEY);
}

/** Constant-time compare, so the key can't be recovered by timing attempts. */
function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function assertMayCreateRoom(provided: unknown): void {
  const expected = process.env.MKK_HOST_KEY;
  if (!expected) return;

  if (typeof provided !== "string" || !matches(provided.trim(), expected)) {
    throw new ApiFault(
      "host_key_required",
      "A host passcode is required to open a room here",
    );
  }
}

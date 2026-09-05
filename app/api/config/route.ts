import type { PublicConfig } from "@/lib/contracts";
import { hostKeyRequired } from "@/lib/server/hostKey";
import { faultToResponse, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/config — what the entry screen needs to render correctly.
 *
 * Reports only *whether* a host passcode is required, never the passcode
 * itself. Knowing that hosting is gated tells an attacker nothing they could
 * not learn by clicking the button.
 */
export async function GET() {
  try {
    const config: PublicConfig = { hostKeyRequired: hostKeyRequired() };
    return ok(config);
  } catch (err) {
    return faultToResponse(err);
  }
}

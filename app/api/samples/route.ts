import { SAMPLES } from "@/lib/game/samples";
import { faultToResponse, ok } from "@/lib/server/respond";

/**
 * GET /api/samples — ready-made material a host can load in one click.
 *
 * Public and side-effect free: it exposes no room, no player and no secret, so
 * it needs no session. Served from the API rather than bundled into the client
 * so the set can grow without shipping a new frontend.
 */
export async function GET() {
  try {
    return ok(SAMPLES);
  } catch (err) {
    return faultToResponse(err);
  }
}

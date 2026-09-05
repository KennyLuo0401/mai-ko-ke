import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { getRoomView, removePlayer } from "@/lib/server/store";

export const dynamic = "force-dynamic";
// Removing the last player a phase was waiting on can complete it, which in
// FINAL_VOTE triggers consensus drafting — a live model call.
export const maxDuration = 60;

/**
 * POST /api/rooms/:id/remove-player — host drops a player who stopped answering.
 *
 * The escape hatch for a round frozen by someone closing their tab. Authority
 * is checked in the store, not here.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    const body = (await readJson(request)) as Record<string, unknown>;
    const playerId = body?.playerId;
    if (typeof playerId !== "string" || !playerId) {
      throw new ApiFault("invalid_input", "playerId is required");
    }

    await removePlayer(id, userId, playerId);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

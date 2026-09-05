import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok } from "@/lib/server/respond";
import { getRoomView, retryConsensus } from "@/lib/server/store";

export const dynamic = "force-dynamic";
// Redrafting consensus is a live model call.
export const maxDuration = 60;

/**
 * POST /api/rooms/:id/retry-consensus — host retries a failed draft.
 * Player answers are preserved; only the drafting step runs again (§20.2).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    await retryConsensus(id, userId);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

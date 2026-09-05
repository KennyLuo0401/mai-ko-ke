import type { GameState, HostAction } from "@/lib/contracts";
import { GAME_STATES } from "@/lib/contracts";
import { hostTransition } from "@/lib/game/machine";
import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { advance, getRoomView } from "@/lib/server/store";

export const dynamic = "force-dynamic";
// Publishing writes the closing summary, which is a live model call.
export const maxDuration = 60;

/** POST /api/rooms/:id/advance — host-only, guarded phase transition. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    const body = (await readJson(request)) as Record<string, unknown>;

    const expectedState = body?.expectedState;
    if (
      typeof expectedState !== "string" ||
      !GAME_STATES.includes(expectedState as GameState)
    ) {
      throw new ApiFault("invalid_input", "expectedState is not a known state");
    }

    const action = body?.action;
    if (typeof action !== "string" || !hostTransition(action as HostAction)) {
      throw new ApiFault("invalid_input", "action is not a known host action");
    }

    await advance(id, userId, expectedState as GameState, action as HostAction);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

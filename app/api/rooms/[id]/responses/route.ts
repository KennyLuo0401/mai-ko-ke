import { parseResponsePayload, RuleError } from "@/lib/game/rules";
import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { getRoomView, saveResponse } from "@/lib/server/store";

export const dynamic = "force-dynamic";
// The final answer of the round triggers consensus drafting, a live model call.
export const maxDuration = 60;

/** POST /api/rooms/:id/responses — saves the caller's own answer only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    // The room's own reason IDs bound what a client may submit.
    const view = await getRoomView(id, userId);
    const validReasonIds = (view.reasons ?? []).map((r) => r.id);

    const body = await readJson(request);
    let payload;
    try {
      payload = parseResponsePayload(body, validReasonIds);
    } catch (err) {
      throw new ApiFault("invalid_input", (err as RuleError).message);
    }

    await saveResponse(id, userId, payload);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

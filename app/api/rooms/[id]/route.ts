import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok } from "@/lib/server/respond";
import { getRoomView } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** GET /api/rooms/:id — the role-filtered RoomView for the caller. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

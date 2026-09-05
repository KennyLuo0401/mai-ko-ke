import type { CreateRoomResponse } from "@/lib/contracts";
import { parseLanguage, RuleError } from "@/lib/game/rules";
import { assertMayCreateRoom } from "@/lib/server/hostKey";
import { getOrCreateUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { createRoom } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** POST /api/rooms — the host creates a room. */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    let language;
    try {
      language = parseLanguage(body?.language);
    } catch (err) {
      throw new ApiFault("invalid_input", (err as RuleError).message);
    }

    // Checked before a session is minted, so a refused attempt leaves nothing.
    assertMayCreateRoom(body?.hostKey);

    const userId = await getOrCreateUserId();
    const result: CreateRoomResponse = await createRoom(userId, language);
    return ok(result);
  } catch (err) {
    return faultToResponse(err);
  }
}

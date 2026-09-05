import type { JoinRoomResponse } from "@/lib/contracts";
import {
  isValidRoomCode,
  parseLanguage,
  parseNickname,
  RuleError,
} from "@/lib/game/rules";
import { getOrCreateUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { joinRoom } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** POST /api/rooms/join — a player joins with a six-digit code. */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;

    const roomCode = typeof body?.roomCode === "string" ? body.roomCode.trim() : "";
    if (!isValidRoomCode(roomCode)) {
      throw new ApiFault("invalid_input", "Room code must be six digits");
    }

    let nickname: string;
    let language;
    try {
      nickname = parseNickname(body?.nickname);
      language = parseLanguage(body?.language);
    } catch (err) {
      throw new ApiFault("invalid_input", (err as RuleError).message);
    }

    const userId = await getOrCreateUserId();
    const result: JoinRoomResponse = await joinRoom(
      userId,
      roomCode,
      nickname,
      language,
    );
    return ok(result);
  } catch (err) {
    return faultToResponse(err);
  }
}

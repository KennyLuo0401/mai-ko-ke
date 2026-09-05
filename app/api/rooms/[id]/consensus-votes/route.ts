import type { ConsensusDecision } from "@/lib/contracts";
import { CONSENSUS_DECISIONS } from "@/lib/contracts";
import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { getRoomView, voteConsensus } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** POST /api/rooms/:id/consensus-votes — one vote per player per statement. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    const body = (await readJson(request)) as Record<string, unknown>;

    const statementId = body?.statementId;
    if (typeof statementId !== "string" || !statementId) {
      throw new ApiFault("invalid_input", "statementId is required");
    }

    const decision = body?.decision;
    if (
      typeof decision !== "string" ||
      !CONSENSUS_DECISIONS.includes(decision as ConsensusDecision)
    ) {
      throw new ApiFault(
        "invalid_input",
        "decision must be agree, needs_revision or disagree",
      );
    }

    await voteConsensus(id, userId, statementId, decision as ConsensusDecision);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

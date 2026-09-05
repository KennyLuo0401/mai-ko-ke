import { parseHostQuestion, parseSourceText, RuleError } from "@/lib/game/rules";
import { getUserId } from "@/lib/server/identity";
import { ApiFault, faultToResponse, ok, readJson } from "@/lib/server/respond";
import { getRoomView, submitMaterial } from "@/lib/server/store";

export const dynamic = "force-dynamic";
// Analysis is a live model call (~10s) plus up to three attempts, so this must
// outlast the platform's short default function timeout.
export const maxDuration = 60;

/** POST /api/rooms/:id/material — host submits material; analysis runs. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    if (!userId) throw new ApiFault("unauthenticated", "No session");

    const body = (await readJson(request)) as Record<string, unknown>;
    let sourceText: string;
    let hostQuestion: string;
    try {
      sourceText = parseSourceText(body?.sourceText);
      hostQuestion = parseHostQuestion(body?.hostQuestion);
    } catch (err) {
      throw new ApiFault("invalid_input", (err as RuleError).message);
    }

    await submitMaterial(id, userId, sourceText, hostQuestion);
    return ok(await getRoomView(id, userId));
  } catch (err) {
    return faultToResponse(err);
  }
}

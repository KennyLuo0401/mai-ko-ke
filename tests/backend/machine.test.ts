import { describe, expect, it } from "vitest";
import {
  acceptsNewPlayers,
  autoTransitionOnComplete,
  hostTransition,
  isRevealed,
  revealTransition,
  stageForState,
} from "@/lib/game/machine";

describe("state machine", () => {
  it("maps each answering state to its stage", () => {
    expect(stageForState("INITIAL_VOTE")).toBe("initial");
    expect(stageForState("PRIVATE_CARD")).toBe("card");
    expect(stageForState("FINAL_VOTE")).toBe("final");
    expect(stageForState("REVEALED")).toBeNull();
  });

  it("only allows host actions from their own source state", () => {
    expect(hostTransition("start_initial_vote")).toEqual({
      from: "BRIEFING_READY",
      to: "INITIAL_VOTE",
    });
    expect(hostTransition("publish")).toEqual({
      from: "CONSENSUS_REVIEW",
      to: "COMPLETED",
    });
  });

  it("advances automatically only where completion drives the phase", () => {
    expect(autoTransitionOnComplete("INITIAL_VOTE")).toBe("PRIVATE_CARD");
    expect(autoTransitionOnComplete("PRIVATE_CARD")).toBe("READY_TO_REVEAL");
    // Completing FINAL_VOTE starts drafting, which is not a transition.
    expect(autoTransitionOnComplete("FINAL_VOTE")).toBeNull();
  });

  it("reveals from exactly one state", () => {
    expect(revealTransition("READY_TO_REVEAL")).toBe("REVEALED");
    expect(revealTransition("REVEALED")).toBeNull();
    expect(revealTransition("PRIVATE_CARD")).toBeNull();
  });

  it("closes the room to new players once answering starts", () => {
    expect(acceptsNewPlayers("LOBBY")).toBe(true);
    expect(acceptsNewPlayers("BRIEFING_READY")).toBe(true);
    expect(acceptsNewPlayers("INITIAL_VOTE")).toBe(false);
    expect(acceptsNewPlayers("REVEALED")).toBe(false);
  });

  it("treats every post-reveal phase as revealed", () => {
    expect(isRevealed("PRIVATE_CARD")).toBe(false);
    expect(isRevealed("READY_TO_REVEAL")).toBe(false);
    expect(isRevealed("REVEALED")).toBe(true);
    expect(isRevealed("COMPLETED")).toBe(true);
  });
});

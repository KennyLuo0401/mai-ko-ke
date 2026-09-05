/**
 * Deterministic state machine / 確定性狀態機 (BUILD_PLAN §7, §20.2)
 *
 * Pure functions only. State transitions are code, never AI decisions, and
 * never trusted from the client. Automatic transitions (all players finished)
 * are computed here and applied by the store under a lock.
 */

import type { GameState, HostAction, ResponseStage } from "@/lib/contracts";

/** Which host action is legal in which state. */
const HOST_TRANSITIONS: Record<HostAction, { from: GameState; to: GameState }> =
  {
    start_initial_vote: { from: "BRIEFING_READY", to: "INITIAL_VOTE" },
    start_discussion: { from: "REVEALED", to: "IN_PERSON_DISCUSSION" },
    start_final_vote: { from: "IN_PERSON_DISCUSSION", to: "FINAL_VOTE" },
    publish: { from: "CONSENSUS_REVIEW", to: "COMPLETED" },
  };

export function hostTransition(
  action: HostAction,
): { from: GameState; to: GameState } | null {
  return HOST_TRANSITIONS[action] ?? null;
}

/** The answering stage a state collects, or null if it collects none. */
export function stageForState(state: GameState): ResponseStage | null {
  switch (state) {
    case "INITIAL_VOTE":
      return "initial";
    case "PRIVATE_CARD":
      return "card";
    case "FINAL_VOTE":
      return "final";
    default:
      return null;
  }
}

/** States in which a player may still be answering. */
export function isAnsweringState(state: GameState): boolean {
  return stageForState(state) !== null;
}

/**
 * The automatic transition that fires once every required player has finished
 * the current stage. `null` means the phase waits for a host action instead.
 *
 * FINAL_VOTE deliberately returns null: completing it starts consensus
 * drafting, which is a processing step, not a state change (§20.2).
 */
export function autoTransitionOnComplete(state: GameState): GameState | null {
  switch (state) {
    case "INITIAL_VOTE":
      return "PRIVATE_CARD";
    case "PRIVATE_CARD":
      return "READY_TO_REVEAL";
    default:
      return null;
  }
}

/** Reveal is a single guarded hop that must happen exactly once. */
export function revealTransition(state: GameState): GameState | null {
  return state === "READY_TO_REVEAL" ? "REVEALED" : null;
}

/** New players may only join before the roster is frozen. */
export function acceptsNewPlayers(state: GameState): boolean {
  return state === "LOBBY" || state === "MATERIAL_SUBMITTED" || state === "BRIEFING_READY";
}

/** Answers from every stage stay visible to their author; reveal is public. */
export function isRevealed(state: GameState): boolean {
  const order: GameState[] = [
    "REVEALED",
    "IN_PERSON_DISCUSSION",
    "FINAL_VOTE",
    "CONSENSUS_REVIEW",
    "COMPLETED",
  ];
  return order.includes(state);
}

export function isConsensusPhase(state: GameState): boolean {
  return state === "CONSENSUS_REVIEW" || state === "COMPLETED";
}

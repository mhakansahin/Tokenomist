// TrackingState machine (data-model.md, "TrackingState geçişleri").

import { TrackingState } from "./types";

export interface TrackingStatus {
  state: TrackingState;
  resumeState?: Exclude<TrackingState, "suspended">;
}

export type TrackingEvent =
  | { type: "writingStarted" }
  | { type: "specSaved" }
  | { type: "lock" }
  | { type: "tasksComplete" }
  | { type: "finishDeclined" }
  | { type: "finish" }
  | { type: "suspend" }
  | { type: "resume" };

export class InvalidTransitionError extends Error {
  constructor(state: TrackingState, event: TrackingEvent["type"]) {
    super(`Invalid tracking transition: ${state} --${event}-->`);
  }
}

export function transition(current: TrackingStatus, event: TrackingEvent): TrackingStatus | "completed" {
  const { state } = current;
  const invalid = (): never => {
    throw new InvalidTransitionError(state, event.type);
  };

  if (state === "suspended") {
    return event.type === "resume" && current.resumeState ? { state: current.resumeState } : invalid();
  }

  switch (event.type) {
    case "writingStarted":
      return state === "writing" || state === "awaitingApproval" ? { state: "writing" } : { state };
    case "specSaved":
      return state === "writing" || state === "awaitingApproval" ? { state: "awaitingApproval" } : { state };
    case "lock":
      return state === "writing" || state === "awaitingApproval" ? { state: "locked" } : invalid();
    case "tasksComplete":
      if (state === "locked" || state === "completionPending") {
        return { state: "completionPending" };
      }
      return invalid();
    case "finishDeclined":
      return state === "completionPending" ? { state: "locked" } : invalid();
    case "finish":
      return state === "locked" || state === "completionPending" ? "completed" : invalid();
    case "suspend":
      return { state: "suspended", resumeState: state };
    case "resume":
      return invalid();
  }
}

/** Only the active, non-suspended record may write the `model` key. */
export function managesModelKey(state: TrackingState): boolean {
  return state !== "suspended";
}

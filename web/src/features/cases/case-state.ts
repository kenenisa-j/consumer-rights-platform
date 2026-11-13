import { nextLevel } from "@consumer-rights/contracts";
import type { CaseData, Stamp, ThreadMessage, UpdateEntry } from "@/types/case";

// Pure rules for what a consumer can do on their own case. No React and no alias imports at runtime, so it
// is unit-tested with node:test. The backend owns the real rules; this mirrors them for the demo and for
// optimistic UI (see documentation/domain-model.md: one level at a time, every move recorded).

export type CaseAction =
  | { type: "send_message"; text: string }
  | { type: "accept_offer" }
  | { type: "counter_offer"; ask: string; text: string }
  | { type: "escalate"; reason: string; text?: string }
  | { type: "accept_settlement" }
  | { type: "decline_settlement"; reason: string; text: string }
  | { type: "send_info"; text: string; fileCount: number }
  | { type: "reschedule"; when: string; why?: string }
  | { type: "withdraw"; reason: string }
  | { type: "dispute_outside"; text: string };

export interface CaseResult { next: CaseData; notice: string; ok: boolean }

const entry = (title: string, at: Stamp, text?: string): UpdateEntry => ({ title, when: at.when, iso: at.iso, text });
const mine = (s: CaseData, at: Stamp, text: string): ThreadMessage =>
  ({ id: `me-${s.thread.length + 1}`, from: "me", who: "You", when: at.short, text });
const refuse = (state: CaseData): CaseResult => ({ next: state, ok: false, notice: "That action is not available on this case." });

export function applyAction(state: CaseData, action: CaseAction, at: Stamp): CaseResult {
  if (state.closed && action.type !== "dispute_outside") return refuse(state);
  const ok = (next: CaseData, notice: string): CaseResult => ({ next, notice, ok: true });
  const withUpdate = (title: string, text?: string) => [entry(title, at, text), ...state.updates];

  switch (action.type) {
    case "send_message":
      return ok({ ...state, thread: [mine(state, at, action.text), ...state.thread] }, `Your message was sent to ${state.counterpart}.`);

    case "accept_offer":
      if (state.pending !== "business_offer" && state.pending !== "business_refund") return refuse(state);
      return ok({ ...state, stage: "resolved", closed: true, pending: "none", offer: undefined, official: "Resolved",
        status: { label: "Resolved: you accepted the offer", tone: "ok" },
        banner: { tone: "ok", title: "You accepted the offer. The complaint is resolved.", text: "The business confirms when it has done what it offered." },
        updates: withUpdate("You accepted the offer", "The complaint is resolved between you and the business.") },
        "You accepted the offer. The complaint is resolved.");

    case "counter_offer":
      if (state.stage !== "business" || (state.pending !== "business_offer" && state.pending !== "business_refund")) return refuse(state);
      return ok({ ...state, thread: [mine(state, at, `Counter-offer: ${action.ask}. ${action.text}`.trim()), ...state.thread],
        status: { label: "Waiting for the business to answer", tone: "info" }, pending: "none",
        banner: { tone: "plain", title: "Your counter-offer was sent to the business.", text: "You get a message when it answers." },
        updates: withUpdate("You made a counter-offer", action.ask) }, "Your counter-offer was sent to the business.");

    case "escalate": {
      const level = nextLevel(state.stage === "resolved" ? "bureau" : state.stage);
      if (state.stage !== "business" || level !== "woreda") return refuse(state);
      return ok({ ...state, stage: "woreda", pending: "none", offer: undefined, official: "Under Initial Review", counterpart: "the Woreda office",
        status: { label: "Waiting for the Woreda to accept", tone: "info" },
        handledBy: [["Office", "Your Woreda trade office"], ["Officer", "Not assigned yet"]],
        banner: { tone: "plain", title: "You moved your complaint to the Woreda.", text: "The business was told. An officer will accept it and contact you." },
        updates: withUpdate("You moved it to the Woreda", action.reason) }, "Your complaint was moved to the Woreda.");
    }

    case "accept_settlement":
      if (state.pending !== "settlement") return refuse(state);
      return ok({ ...state, pending: "none", status: { label: "You accepted: waiting for the refund", tone: "ok" },
        banner: { tone: "ok", title: "You accepted the solution.", text: "When the refund is paid, your complaint is resolved." },
        updates: withUpdate("You accepted the solution") }, "Your answer was sent to the officer.");

    case "decline_settlement":
      if (state.pending !== "settlement") return refuse(state);
      return ok({ ...state, pending: "none", status: { label: "You did not accept the solution", tone: "warn" },
        banner: { tone: "plain", title: "Your answer was sent.", text: "The officer can try again with the business, or refer the case for further action." },
        updates: withUpdate("You did not accept the solution", action.reason), thread: [mine(state, at, action.text), ...state.thread] },
        "Your answer was sent to the officer.");

    case "send_info":
      if (state.pending !== "info_required") return refuse(state);
      return ok({ ...state, pending: "none", infoRequest: undefined, official: "Under Initial Review",
        status: { label: "Being checked", tone: "info" },
        banner: { tone: "ok", title: "Your information was sent.", text: "The officer will check it and tell you." },
        thread: [mine(state, at, action.text), ...state.thread],
        updates: withUpdate("You sent more information", action.fileCount ? `${action.fileCount} file(s) added.` : undefined) },
        "Your information was sent to the officer.");

    case "reschedule":
      if (state.pending !== "meeting") return refuse(state);
      return ok({ ...state, thread: [mine(state, at, `I cannot come then. I can come: ${action.when}. ${action.why ?? ""}`.trim()), ...state.thread] },
        "Your request was sent to the officer.");

    case "withdraw":
      return ok({ ...state, closed: true, pending: "none", official: "Closed", offer: undefined, meeting: undefined,
        status: { label: "Withdrawn by you", tone: "grey" },
        banner: { tone: "plain", title: "You withdrew this complaint.", text: "You can make a new complaint later if needed." },
        updates: withUpdate("You withdrew the complaint", action.reason) }, "The complaint was withdrawn.");

    case "dispute_outside":
      if (state.pending !== "outside") return refuse(state);
      return ok({ ...state, thread: [mine(state, at, action.text), ...state.thread] }, "Your message was sent to the officer.");
  }
}

import type { Stamp } from "@/types/case";
import type { BizCase, BizMessage } from "@/types/biz";

// Pure rules for what a business can do on a complaint about it. No React and no alias imports at runtime,
// so node:test covers it. The backend owns the real rules; this mirrors them for the demo.

export type BizAction =
  | { type: "reply"; explanation: string; position: string; offer: string; amount: string; detail: string }
  | { type: "offer_refund"; amount: string; when: string }
  | { type: "different_offer"; kind: string; amount: string; message: string }
  | { type: "keep_offer"; message: string }
  | { type: "confirm_paid"; date: string; time?: string; how: string; hasProof: boolean }
  | { type: "message_officer"; text: string };

export interface BizResult { next: BizCase; notice: string; ok: boolean }

const mine = (s: BizCase, at: Stamp, text: string): BizMessage => ({ id: `me-${s.thread.length + 1}`, from: "me", who: "You", when: at.short, text });

export function applyBizAction(state: BizCase, action: BizAction, at: Stamp): BizResult {
  const refuse = (notice: string): BizResult => ({ next: state, ok: false, notice });
  const done = (patch: Partial<BizCase>, title: string, notice: string, text?: string, message?: string): BizResult => ({
    ok: true, notice,
    next: { ...state, ...patch, history: [{ title, when: at.when, iso: at.iso, text }, ...state.history],
      thread: message ? [mine(state, at, message), ...state.thread] : state.thread }
  });
  const waiting = { label: "Waiting for the consumer", tone: "info" as const };

  if (state.closed) return refuse("This complaint is closed.");

  switch (action.type) {
    case "reply": {
      if (state.pending !== "reply") return refuse("There is nothing to reply to right now.");
      const offer = action.offer === "refund" ? `a refund of ${action.amount} ETB` : action.offer === "replacement" ? `a replacement: ${action.detail}` : action.detail;
      return done({ pending: "none", deadline: undefined, status: waiting, official: "Sent to the business",
        banner: { tone: "ok", title: "Your reply was sent to the consumer.", text: "You get a message when they answer." } },
        "You replied", "Your reply was sent to the consumer.", `You offered ${offer}.`, `${action.explanation} I offer ${offer}.`);
    }
    case "offer_refund":
      if (state.pending !== "answer") return refuse("There is no answer to respond to right now.");
      return done({ pending: "none", status: waiting }, "You offered the refund", "Your new offer was sent to the consumer.",
        `${action.amount} ETB, ${action.when}.`, `We offer the full refund of ${action.amount} ETB, ${action.when}.`);
    case "different_offer":
      if (state.pending !== "answer") return refuse("There is no answer to respond to right now.");
      return done({ pending: "none", status: waiting }, "You made a different offer", "Your new offer was sent to the consumer.",
        `${action.kind}${action.amount ? `: ${action.amount} ETB` : ""}.`, action.message || `We offer: ${action.kind}.`);
    case "keep_offer":
      if (state.pending !== "answer") return refuse("There is no answer to respond to right now.");
      return done({ pending: "none", status: waiting }, "Offer kept", "Your answer was sent to the consumer.",
        "You kept your offer. The consumer can move the complaint to the Woreda.", action.message || "We stand by our offer.");
    case "confirm_paid":
      if (state.pending !== "agreed" && state.pending !== "settlement") return refuse("There is nothing to confirm right now.");
      if (state.pending === "settlement" && !action.hasProof) return refuse("Add the signed refund receipt first.");
      return done({ pending: "none", closed: state.pending === "agreed", status: { label: state.pending === "agreed" ? "Waiting for the consumer to confirm" : "Waiting for the officer to check", tone: "ok" },
        official: state.pending === "agreed" ? "Resolved by agreement" : "Settlement Pending",
        banner: { tone: "ok", title: state.pending === "agreed" ? "Thank you. The consumer was asked to confirm." : "Thank you. The officer will check the proof and close the complaint." } },
        "You confirmed the refund was paid", state.pending === "agreed" ? "Thank you. The consumer was asked to confirm." : "Thank you. The officer will check the proof.",
        `${action.date}${action.time ? ` ${action.time}` : ""}, ${action.how}.`);
    case "message_officer":
      if (state.pending !== "gov" && state.pending !== "settlement") return refuse("There is no officer to write to right now.");
      return done({}, "You wrote to the officer", "Your message was sent to the officer.", undefined, action.text);
  }
}

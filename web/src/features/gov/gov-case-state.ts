import { nextLevel } from "@consumer-rights/contracts";
import type { Stamp, UpdateEntry } from "@/types/case";
import type { GovCase, GovLevel } from "@/types/gov";

// Pure rules for what an officer can do on a case. Mirrors the domain model: only the level that holds a case
// can act on it, a case must be accepted first, it passes up exactly one level at a time, and the City Bureau
// (the last level) refers instead of passing up. No React and no alias imports at runtime, so node:test covers it.

export type GovAction =
  | { type: "accept"; officer: string; note?: string }
  | { type: "record_visit"; date: string; time: string; findings: string }
  | { type: "set_meeting"; date: string; time: string; place: string }
  | { type: "propose_solution"; kind: string; amount: string; by: string; terms: string }
  | { type: "record_paid"; date: string; time: string; amount: string }
  | { type: "record_contact"; text: string }
  | { type: "resolve"; note?: string }
  | { type: "pass_up"; why: string; note: string; toOffice: string }
  | { type: "refer"; to: string; note: string };

export interface GovResult { next: GovCase; notice: string; ok: boolean }

export const LEVEL_LABEL: Record<GovLevel, string> = { woreda: "Woreda", subcity: "Sub-City", bureau: "City Bureau" };

const entry = (title: string, at: Stamp, text?: string): UpdateEntry => ({ title, when: at.when, iso: at.iso, text });
const TOLD = "The consumer and the business were told.";

export function applyGovAction(state: GovCase, viewer: GovLevel, action: GovAction, at: Stamp, actor: string): GovResult {
  const refuse = (notice: string): GovResult => ({ next: state, ok: false, notice });
  const ok = (patch: Partial<GovCase>, title: string, notice: string, text?: string): GovResult =>
    ({ next: { ...state, ...patch, history: [entry(title, at, text), ...state.history] }, ok: true, notice });

  if (state.closed) return refuse("This case is closed.");
  if (state.heldBy !== viewer) return refuse(`This case is now with the ${LEVEL_LABEL[state.heldBy]}.`);
  if (action.type === "accept" ? state.accepted : !state.accepted) {
    return refuse(action.type === "accept" ? "This case was already accepted." : "Accept the case first.");
  }

  switch (action.type) {
    case "accept":
      return ok({ accepted: true, officer: action.officer, status: { label: "Accepted: in progress", tone: "info" }, official: "Assigned" },
        `Accepted by the ${LEVEL_LABEL[viewer]}`, "The case was accepted and assigned.", `Officer ${action.officer}.${action.note ? ` ${action.note}` : ""}`);

    case "record_visit":
      return ok({ status: { label: "Visit done", tone: "info" }, official: "Under Investigation" },
        "Visit to the stall", `Saved. ${TOLD}`, `${action.findings} (${action.date} ${action.time})`);

    case "set_meeting": {
      const when = `${action.date} ${action.time}, ${action.place}`;
      return ok({ meeting: when, status: { label: "Meeting set", tone: "info" }, official: "Under Reconciliation" },
        "Meeting set", `Saved. ${TOLD}`, when);
    }

    case "propose_solution":
      return ok({ solution: { type: action.kind, amount: action.amount, by: action.by, terms: action.terms },
        status: { label: "Solution proposed", tone: "warn" }, official: "Settlement Pending" },
        "Solution proposed", `Saved. ${TOLD}`, `${action.kind}${action.amount ? `: ${action.amount} ETB` : ""}. ${action.terms}`);

    case "record_paid":
      if (!state.solution) return refuse("Propose a solution first, then record that it was done.");
      return ok({ resolvedAt: viewer, closed: true, status: { label: "Resolved here: paid", tone: "ok" }, official: "Resolved" },
        "Refund paid", `Resolved at this level. ${TOLD}`, `${action.amount} ETB, recorded ${action.date} ${action.time}. The website records the refund; it does not send money.`);

    case "record_contact":
      if (state.onPlatform) return refuse("This business is on AddisB2B. Write to it in Messages instead.");
      return ok({}, "Contact with the business", "Saved.", action.text);

    case "resolve":
      return ok({ resolvedAt: viewer, closed: true, status: { label: "Resolved here", tone: "ok" }, official: "Resolved" },
        "Marked as resolved", `Resolved at this level. ${TOLD}`, action.note);

    case "pass_up": {
      const to = nextLevel(viewer);
      if (!to || to === "business") return refuse("The City Bureau is the last level. Refer the case for further action instead.");
      return ok({ heldBy: to as GovLevel, accepted: false, officer: undefined, passedThrough: [...state.passedThrough, viewer],
        status: { label: `Passed up to ${action.toOffice}`, tone: "info" }, official: "Escalated / Referred",
        handovers: [...state.handovers, { title: `Not resolved at the ${LEVEL_LABEL[viewer]}`, from: actor, when: at.when, text: `${action.why}. ${action.note}`.trim() }] },
        `Passed up to ${action.toOffice}`, `Passed to ${action.toOffice}. ${TOLD}`, `${action.why}. ${action.note}`.trim());
    }

    case "refer":
      if (viewer !== "bureau") return refuse("Only the City Bureau refers a case for further action.");
      return ok({ referredTo: action.to, closed: true, resolvedAt: undefined, status: { label: `Referred to ${action.to}`, tone: "info" }, official: "Escalated / Referred" },
        `Referred to ${action.to}`, `The case was referred. ${TOLD}`, action.note);
  }
}

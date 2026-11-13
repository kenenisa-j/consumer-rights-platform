import type { Stamp, UpdateEntry } from "@/types/case";
import type { GovLevel } from "@/types/gov";

// Pure rules for what an officer can do with a tip. Tips are kept apart from complaints and are anonymous: the sender
// has no identity on record and the private code is held only by the sender, so nothing here reads either.
// Each level has its own actions (prototype/{woreda,subcity,bureau}/tip-00045.html). No React and no alias imports at
// runtime, so node:test covers it.

export interface GovTip {
  reference: string;
  title: string;
  where: string;
  seen: string;
  what: string;
  source: string;
  status: string;
  /** Who holds the tip now, as text: "Woreda 7", "Akaki Kality Sub-City", "City Bureau". */
  holder: string;
  closed?: boolean;
  caseRef?: string;
  history: UpdateEntry[];
}

export type TipAction =
  | { type: "plan_visit"; date: string; officer: string; note: string }
  | { type: "send_to_woreda"; woreda: string; note: string }
  | { type: "make_case"; category: string; caseRef: string; officer?: string }
  | { type: "close"; result: string; note: string };

export interface TipResult { next: GovTip; notice: string; ok: boolean }

export function applyTipAction(tip: GovTip, level: GovLevel, action: TipAction, at: Stamp): TipResult {
  const refuse = (notice: string): TipResult => ({ next: tip, ok: false, notice });
  const ok = (patch: Partial<GovTip>, title: string, notice: string, text?: string): TipResult =>
    ({ ok: true, notice, next: { ...tip, ...patch, history: [{ title, when: at.when, iso: at.iso, text } as UpdateEntry, ...tip.history] } });

  if (tip.closed) return refuse("This tip is closed.");
  if (tip.caseRef) return refuse(`This tip already became case ${tip.caseRef}.`);

  switch (action.type) {
    case "plan_visit":
      if (level !== "woreda") return refuse("Only the Woreda plans a visit.");
      return ok({ status: "Follow-up planned" }, "Visit planned", "The visit is planned. It shows on the officer's dashboard.", `${action.date}, ${action.officer}. ${action.note}`.trim());

    case "send_to_woreda":
      if (level !== "subcity") return refuse("Only the Sub-City sends a tip to a Woreda.");
      return ok({ holder: action.woreda, status: `With ${action.woreda}` }, `Sent to ${action.woreda}`, "The tip was sent to the Woreda.", action.note || undefined);

    case "make_case": {
      // The City Bureau sends the new case to the Woreda where it happened; the other levels keep it.
      const holder = tip.holder;
      return ok({ caseRef: action.caseRef, status: "Converted to case" },
        `Made into case ${action.caseRef}`, level === "bureau" ? `The tip became case ${action.caseRef}. The case went to the Woreda where it happened.` : `The tip became case ${action.caseRef}, held by ${holder}.`,
        `Category: ${action.category}. The sender stays anonymous.`);
    }

    case "close":
      return ok({ closed: true, status: action.result }, "Tip closed", "The tip was closed.", action.note || undefined);
  }
}

"use client";

import type { FormEvent, ReactNode } from "react";
import { bi } from "@/content/types";
import { Dialog } from "@/components/ui/Dialog";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import type { CaseAction } from "./case-state";

export type DialogName = "counter" | "escalate" | "decline" | "reschedule" | "withdraw";

interface Props {
  open: DialogName | null;
  paid: string;
  onClose: () => void;
  onAction: (action: CaseAction) => void;
}

function Form({ onSubmit, children, submit, tone, onCancel, cancel = "Cancel" }: {
  onSubmit: (data: FormData) => void; children: ReactNode; submit: string; tone?: "danger"; onCancel: () => void; cancel?: string;
}) {
  const handle = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); };
  return (
    <form onSubmit={handle}>
      {children}
      <div className="btn-row">
        <button className={`btn${tone ? ` btn--${tone}` : ""}`} type="submit">{submit}</button>
        <button className="btn btn--secondary" type="button" onClick={onCancel}>{cancel}</button>
      </div>
    </form>
  );
}

const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

export function CaseDialogs({ open, paid, onClose, onAction }: Props) {
  const done = (a: CaseAction) => { onAction(a); onClose(); };
  return (
    <>
      <Dialog open={open === "counter"} onClose={onClose} title={bi("Make a counter-offer", "ሌላ ሃሳብ ያቅርቡ")}>
        <p>Tell the business what you would accept. If it agrees, the complaint is resolved between you.</p>
        <Form onCancel={onClose} submit="Send to the business"
          onSubmit={d => done({ type: "counter_offer", ask: str(d, "ask"), text: str(d, "message") })}>
          <ChoiceGroup name="ask" legend="What would be fair?" columns={1} options={[
            { value: `A refund of ${paid}`, title: `A refund of ${paid}` }, { value: "A partial refund", title: "A partial refund" },
            { value: "Something else", title: "Something else" }]} />
          <TextAreaField id="co-message" name="message" label="Message to the business" optional maxLength={500} />
        </Form>
      </Dialog>

      <Dialog open={open === "escalate"} onClose={onClose} title={bi("Move it to the Woreda", "ቢሮው እንዲያግዝ ይጠይቁ")}>
        <p>An officer of your Woreda trade office, where you bought, will review your complaint, look at the evidence and help you and the business reach a solution. The business is told. If it is not resolved there, it moves to the Sub-City and then to the City Bureau.</p>
        <Form onCancel={onClose} submit="Move it to the Woreda"
          onSubmit={d => done({ type: "escalate", reason: str(d, "why") })}>
          <ChoiceGroup name="why" legend="Why do you need the Woreda?" columns={1} options={[
            { value: "We could not agree", title: "We could not agree" }, { value: "The business is not answering", title: "The business is not answering" },
            { value: "Another reason", title: "Another reason" }]} />
        </Form>
      </Dialog>

      <Dialog open={open === "decline"} onClose={onClose} title={bi("Why don't you accept?", "ለምን አይቀበሉም?")}>
        <Form onCancel={onClose} submit="Send my answer"
          onSubmit={d => done({ type: "decline_settlement", reason: str(d, "why"), text: str(d, "text") })}>
          <ChoiceGroup name="why" legend="Reason" columns={1} options={[
            { value: "The amount is not enough", title: "The amount is not enough" },
            { value: "The date or place does not suit me", title: "The date or place does not suit me" },
            { value: "Another reason", title: "Another reason" }]} />
          <TextAreaField id="dc-text" name="text" label="Tell the officer more" required minLength={5} maxLength={500}
            invalid="Tell the officer why." />
        </Form>
      </Dialog>

      <Dialog open={open === "reschedule"} onClose={onClose} title={bi("Ask for another time", "ሌላ ጊዜ ይጠይቁ")}>
        <Form onCancel={onClose} submit="Send to the officer" onSubmit={d => done({ type: "reschedule", when: str(d, "when"), why: str(d, "why") })}>
          <TextField id="rs-when" name="when" label="When can you come?" required placeholder="For example: Monday morning" invalid="Tell us when you can come." />
          <TextAreaField id="rs-why" name="why" label="Reason" optional maxLength={300} />
        </Form>
      </Dialog>

      <Dialog open={open === "withdraw"} onClose={onClose} title="Withdraw the complaint?">
        <p>The officer stops working on it and the case is closed. You can make a new complaint later if needed.</p>
        <Form onCancel={onClose} cancel="Keep the complaint" submit="Withdraw" tone="danger"
          onSubmit={d => done({ type: "withdraw", reason: str(d, "why") })}>
          <SelectField id="wd-why" name="why" label="Why are you withdrawing it?" required placeholder="Choose a reason"
            options={["The business already put it right", "I no longer want to continue", "Other"]} invalid="Choose a reason." />
        </Form>
      </Dialog>
    </>
  );
}

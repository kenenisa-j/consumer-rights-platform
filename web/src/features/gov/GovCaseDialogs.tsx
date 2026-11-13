"use client";

import type { FormEvent, ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FileDrop, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import type { GovLevel } from "@/types/gov";
import type { GovAction } from "./gov-case-state";
import { LEVELS } from "./levels";

export type GovDialog = "accept" | "visit" | "meeting" | "solution" | "paid" | "contact" | "resolve" | "pass_up" | "refer";

interface Props { open: GovDialog | null; level: GovLevel; onClose: () => void; onAction: (a: GovAction) => void }

function Form({ onSubmit, submit, onCancel, children, tone }: { onSubmit: (d: FormData) => void; submit: string; onCancel: () => void; children: ReactNode; tone?: "accent" }) {
  const handle = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); };
  return (
    <form onSubmit={handle}>
      {children}
      <div className="btn-row">
        <button className={`btn${tone ? ` btn--${tone}` : ""}`} type="submit">{submit}</button>
        <button className="btn btn--secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const today = () => new Date().toISOString().slice(0, 10);

export function GovCaseDialogs({ open, level, onClose, onAction }: Props) {
  const cfg = LEVELS[level];
  const done = (a: GovAction) => { onAction(a); onClose(); };
  return (
    <>
      <Dialog open={open === "accept"} onClose={onClose} title="Accept the case">
        <Form onCancel={onClose} submit="Accept the case" tone="accent" onSubmit={d => done({ type: "accept", officer: s(d, "officer"), note: s(d, "note") || undefined })}>
          <SelectField id="ac-officer" name="officer" label="Assign to an officer" required options={[cfg.person.name, "Another officer"]} />
          <TextAreaField id="ac-note" name="note" label="Note" optional maxLength={300} />
        </Form>
      </Dialog>

      <Dialog open={open === "visit"} onClose={onClose} title="Record the visit">
        <Form onCancel={onClose} submit="Save the visit" onSubmit={d => done({ type: "record_visit", date: s(d, "date"), time: s(d, "time"), findings: s(d, "findings") })}>
          <div className="form-grid">
            <TextField id="vi-date" name="date" label="Visit date" type="date" max={today()} required defaultValue={today()} invalid="Choose the visit date." />
            <TextField id="vi-time" name="time" label="Time" type="time" required invalid="Write the time." />
          </div>
          <TextAreaField id="vi-find" name="findings" label="What you found" required minLength={5} maxLength={1500} invalid="Write what you found." />
          <div className="field"><span className="label">Photos <span className="opt">(optional)</span></span>
            <FileDrop id="vi-photos" title="Add photos" note="JPG or PNG" accept=".jpg,.jpeg,.png" multiple /></div>
        </Form>
      </Dialog>

      <Dialog open={open === "meeting"} onClose={onClose} title="Set a meeting">
        <Form onCancel={onClose} submit="Set the meeting" tone="accent" onSubmit={d => done({ type: "set_meeting", date: s(d, "date"), time: s(d, "time"), place: s(d, "place") })}>
          <div className="form-grid">
            <TextField id="me-date" name="date" label="Date" type="date" min={today()} required invalid="Choose the date." />
            <TextField id="me-time" name="time" label="Time" type="time" required invalid="Write the time." />
          </div>
          <TextField id="me-place" name="place" label="Place" required maxLength={160} invalid="Write the place." />
          <p className="small muted">The consumer and the business are both told.</p>
        </Form>
      </Dialog>

      <Dialog open={open === "solution"} onClose={onClose} title="Propose a solution">
        <Form onCancel={onClose} submit="Propose to the consumer and the business" tone="accent"
          onSubmit={d => done({ type: "propose_solution", kind: s(d, "type"), amount: s(d, "amount"), by: s(d, "by"), terms: s(d, "terms") })}>
          <SelectField id="so-type" name="type" label="Solution" required options={["Refund", "Replacement", "Repair", "Other"]} />
          <div className="form-grid">
            <TextField id="so-amount" name="amount" label="Amount (ETB)" optional type="number" min={0} inputMode="decimal" />
            <TextField id="so-by" name="by" label="To be done by" type="datetime-local" required invalid="Choose when it must be done." />
          </div>
          <TextAreaField id="so-terms" name="terms" label="Terms" required minLength={5} maxLength={600} invalid="Write the terms." />
        </Form>
      </Dialog>

      <Dialog open={open === "paid"} onClose={onClose} title="Record the refund paid">
        <Form onCancel={onClose} submit="Record the refund and resolve" tone="accent" onSubmit={d => done({ type: "record_paid", date: s(d, "date"), time: s(d, "time"), amount: s(d, "amount") })}>
          <div className="form-grid">
            <TextField id="pa-date" name="date" label="Date" type="date" max={today()} required defaultValue={today()} invalid="Choose the date." />
            <TextField id="pa-time" name="time" label="Time" type="time" required invalid="Write the time." />
          </div>
          <TextField id="pa-amount" name="amount" label="Amount paid (ETB)" type="number" min={0} inputMode="decimal" required invalid="Write the amount paid." />
          <div className="field"><span className="label">Signed receipt <span className="opt">(optional)</span></span>
            <FileDrop id="pa-proof" title="Add the signed receipt" note="JPG, PNG or PDF" /></div>
          <p className="small muted">The website records the refund. It does not send money.</p>
        </Form>
      </Dialog>

      <Dialog open={open === "contact"} onClose={onClose} title="Record contact with the business">
        <p>This business is not on AddisB2B, so you record what it says.</p>
        <Form onCancel={onClose} submit="Save" onSubmit={d => done({ type: "record_contact", text: s(d, "text") })}>
          <TextAreaField id="co-text" name="text" label="What the business said" required minLength={5} maxLength={800} invalid="Write what was said." />
        </Form>
      </Dialog>

      <Dialog open={open === "resolve"} onClose={onClose} title="Mark as resolved">
        <p>The case is closed as resolved at this level. The consumer and the business are told.</p>
        <Form onCancel={onClose} submit="Mark as resolved" tone="accent" onSubmit={d => done({ type: "resolve", note: s(d, "note") || undefined })}>
          <TextAreaField id="re-note" name="note" label="Outcome" optional maxLength={500} />
        </Form>
      </Dialog>

      <Dialog open={open === "pass_up"} onClose={onClose} title="Pass the case up">
        <p>The case moves up to {cfg.upTo}. The consumer and the business are told. {cfg.upTo} can see everything you recorded.</p>
        <Form onCancel={onClose} submit={`Pass to ${cfg.upTo}`} tone="accent"
          onSubmit={d => done({ type: "pass_up", why: s(d, "why"), note: s(d, "note"), toOffice: cfg.upTo ?? "" })}>
          <SelectField id="pu-why" name="why" label="Why was it not resolved here?" required placeholder="Choose a reason" invalid="Choose a reason."
            options={["The business will not agree to what the consumer asks", "The consumer will not accept the offer", "No agreement after the meeting", "Another reason"]} />
          <TextAreaField id="pu-note" name="note" label="Handover note" required minLength={10} maxLength={1000} invalid="Write a handover note for the next office."
            hint="Say what you found and what is still open. The next office reads this first." />
        </Form>
      </Dialog>

      <Dialog open={open === "refer"} onClose={onClose} title="Refer for further action">
        <p>The City Bureau is the last level. If the business will not honour an agreement, the case can be referred for further action.</p>
        <Form onCancel={onClose} submit="Refer the case" tone="accent" onSubmit={d => done({ type: "refer", to: s(d, "to"), note: s(d, "note") })}>
          <SelectField id="rf-to" name="to" label="Refer to" required options={["Legal office", "Market inspection and enforcement"]} />
          <TextAreaField id="rf-note" name="note" label="Note" required minLength={5} maxLength={800} invalid="Write a note." />
        </Form>
      </Dialog>
    </>
  );
}

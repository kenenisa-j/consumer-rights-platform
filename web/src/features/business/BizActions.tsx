"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { BizCase } from "@/types/biz";
import { Alert, KeyValue } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { CheckField, ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { FilePicker, useFilePicker } from "@/components/ui/FileList";
import { Am } from "@/components/ui/Bi";
import { bi } from "@/content/types";
import type { BizAction } from "./biz-case-state";
import { BizReplyForm } from "./BizReplyForm";

type Dlg = "refund" | "other" | "keep" | null;
const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

function Card({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div className="card card--flat"><h3 style={{ fontSize: "1rem" }}>{title}</h3><p className="small">{text}</p>{children}</div>;
}

function DlgForm({ onSubmit, submit, onCancel, children }: { onSubmit: (d: FormData) => void; submit: string; onCancel: () => void; children: ReactNode }) {
  return (
    <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>
      {children}
      <div className="btn-row"><button className="btn" type="submit">{submit}</button><button className="btn btn--secondary" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function ConfirmPaid({ data, onAction }: { data: BizCase; onAction: (a: BizAction) => void }) {
  const picker = useFilePicker(1, 10);
  const need = !!data.proofRequired;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onAction({ type: "confirm_paid", date: s(d, "date"), time: s(d, "time") || undefined, how: s(d, "how") || "Cash", hasProof: picker.files.length > 0 });
  };
  return (
    <div className="card">
      <h2>{need ? "Agreed solution" : "Agreed with the consumer"}<Am text={need ? "የተስማሙበት መፍትሄ" : "ከሸማቹ ጋር ተስማምተዋል"} /></h2>
      {data.agreement && <><h3 style={{ fontSize: "1rem" }}>What you agreed to do</h3><KeyValue rows={data.agreement} /></>}
      <form onSubmit={submit} className="mt-5">
        <h3 style={{ fontSize: "1rem" }}>{need ? "Confirm it is done" : "Confirm you paid"}</h3>
        <div className="form-grid">
          <TextField id="cp-date" name="date" label="Date paid" type="date" required max={new Date().toISOString().slice(0, 10)} invalid="Choose the date." />
          {need ? <TextField id="cp-time" name="time" label="Time" type="time" required invalid="Write the time." />
            : <SelectField id="cp-how" name="how" label="How" options={["Cash", "Bank transfer", "Mobile money"]} />}
        </div>
        <FilePicker id="cp-proof" picker={picker} note="JPG, PNG or PDF · up to 10 MB" />
        {need && picker.files.length === 0 && <p className="small muted">Add the signed refund receipt before you confirm.</p>}
        {need && <CheckField name="confirm" required>I paid the refund in full.</CheckField>}
        <button className="btn mt-4" type="submit" disabled={need && picker.files.length === 0}>Confirm and send</button>
      </form>
    </div>
  );
}

function WriteToOfficer({ data, onAction }: { data: BizCase; onAction: (a: BizAction) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    onAction({ type: "message_officer", text: s(new FormData(f), "message") }); f.reset();
  };
  return (
    <div className="stack">
      {data.gov && data.gov.asks.length > 0 && (
        <div className="card"><h2 style={{ fontSize: "1.1rem" }}>What the {data.gov.office.split(",")[0]} may ask of you</h2>
          <ul className="mb-0">{data.gov.asks.map(a => <li key={a}>{a}</li>)}</ul></div>
      )}
      <form className="card" onSubmit={submit}>
        <h2 style={{ fontSize: "1.1rem" }}>Write to the officer</h2>
        <TextAreaField id="wo-message" name="message" label="Message" required minLength={2} maxLength={1000} invalid="Write a message first." />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}

/** What the business can do now, for the case's current state. */
export function BizActions({ data, onAction }: { data: BizCase; onAction: (a: BizAction) => void }) {
  const [dlg, setDlg] = useState<Dlg>(null);
  const close = () => setDlg(null);
  const done = (a: BizAction) => { onAction(a); close(); };

  if (data.pending === "reply") return <BizReplyForm onReply={onAction} />;
  if (data.pending === "agreed" || data.pending === "settlement") {
    return <div className="stack"><ConfirmPaid data={data} onAction={onAction} />{data.pending === "settlement" && <WriteToOfficer data={data} onAction={onAction} />}</div>;
  }
  if (data.pending === "gov") return <WriteToOfficer data={data} onAction={onAction} />;
  if (data.pending !== "answer") return null;

  return (
    <div className="stack">
      <h2>What do you want to do?<Am text="ምን ማድረግ ይፈልጋሉ?" /></h2>
      <div className="grid-2">
        <Card title="Offer the full refund" text="Agree to what the consumer asks. If they accept, the complaint is resolved between you.">
          <button className="btn btn--accent" type="button" onClick={() => setDlg("refund")}>Offer the full refund</button></Card>
        <Card title="Make a different offer" text="A part refund, a replacement, or something else.">
          <button className="btn btn--secondary" type="button" onClick={() => setDlg("other")}>Make a different offer</button></Card>
        <Card title="Keep my offer" text="The consumer can then move it to the Woreda trade office. You may be asked to attend a meeting.">
          <button className="btn btn--secondary" type="button" onClick={() => setDlg("keep")}>Keep my offer</button></Card>
      </div>

      <Dialog open={dlg === "refund"} onClose={close} title="Offer the full refund">
        <p>You offer the consumer the full refund they asked for. If they accept, the complaint is resolved between you.</p>
        <DlgForm onCancel={close} submit="Offer the refund" onSubmit={d => done({ type: "offer_refund", amount: s(d, "amount"), when: s(d, "when") })}>
          <TextField id="df-amount" name="amount" label="Refund (ETB)" type="number" min={1} required defaultValue="2250" inputMode="decimal" invalid="Write the refund amount." />
          <SelectField id="df-when" name="when" label="When will you pay?" options={["within 2 days", "within 5 days"]} />
        </DlgForm>
      </Dialog>
      <Dialog open={dlg === "other"} onClose={close} title="Make a different offer">
        <DlgForm onCancel={close} submit="Send the offer" onSubmit={d => done({ type: "different_offer", kind: s(d, "kind"), amount: s(d, "amount"), message: s(d, "message") })}>
          <ChoiceGroup name="kind" legend="Your offer" columns={1} options={[{ value: "A partial refund", title: "A partial refund" }, { value: "A replacement", title: "A replacement" }, { value: "Something else", title: "Something else" }]} />
          <TextField id="do-amount" name="amount" label="Amount (ETB), if a refund" optional type="number" min={0} inputMode="decimal" />
          <TextAreaField id="do-message" name="message" label="Message to the consumer" required minLength={5} maxLength={600} invalid="Write a short message." />
        </DlgForm>
      </Dialog>
      <Dialog open={dlg === "keep"} onClose={close} title={bi("Keep my offer", "ሃሳቤን ይዣለሁ")}>
        <p>The consumer can then move it to the Woreda trade office. You will be told, and you may be asked to attend a meeting.</p>
        <DlgForm onCancel={close} submit="Keep my offer" onSubmit={d => done({ type: "keep_offer", message: s(d, "message") })}>
          <TextAreaField id="kp-message" name="message" label="Message to the consumer" optional maxLength={600} />
        </DlgForm>
      </Dialog>
    </div>
  );
}

export function PendingNote({ data }: { data: BizCase }) {
  if (data.pending === "none" && !data.closed) return <Alert icon="clock" title="Nothing for you to do right now">We will tell you when the consumer or an officer answers.</Alert>;
  return null;
}

"use client";

import { useState, type FormEvent } from "react";
import type { CaseData } from "@/types/case";
import { Alert, KeyValue } from "@/components/ui/Display";
import { FileDrop, TextAreaField } from "@/components/ui/Field";
import { Am } from "@/components/ui/Bi";
import type { CaseAction } from "./case-state";
import type { DialogName } from "./CaseDialogs";

interface Props {
  data: CaseData;
  onAction: (action: CaseAction) => void;
  onOpen: (dialog: DialogName) => void;
}

function Choice({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="card card--flat"><h3 style={{ fontSize: "1rem" }}>{title}</h3><p className="small">{text}</p>{children}</div>
  );
}

/** The panel that answers "what can I do now?" for the case's current state. */
export function CaseActions({ data, onAction, onOpen }: Props) {
  const [agree, setAgree] = useState(false);
  const [files, setFiles] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const sendInfo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onAction({ type: "send_info", text: String(d.get("answer") ?? "").trim(), fileCount: files });
  };
  const checkFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const bad = picked.find(f => f.size > 10 * 1024 * 1024);
    setFileError(bad ? `${bad.name} is larger than 10 MB.` : picked.length > 8 ? "Add up to 8 files." : null);
    setFiles(bad || picked.length > 8 ? 0 : picked.length);
  };

  switch (data.pending) {
    case "business_offer":
    case "business_refund": {
      const refund = data.pending === "business_refund";
      return (
        <div className="stack">
          {data.offer && <Alert tone="warn" icon="bag" title={data.offer.title}>{data.offer.text}</Alert>}
          <h2>What would you like to do?<Am text="ምን ማድረግ ይፈልጋሉ?" /></h2>
          <div className="grid-2">
            <Choice title={refund ? "Accept the refund" : "Accept the offer"} text="The complaint is closed as resolved. You agreed it together.">
              <button className="btn btn--accent" type="button" onClick={() => onAction({ type: "accept_offer" })}>
                {refund ? `Accept the refund of ${data.details.paid}` : "Accept the offer"}</button>
            </Choice>
            {!refund && <Choice title="Ask for something else" text="Tell the business what would be fair.">
              <button className="btn btn--secondary" type="button" onClick={() => onOpen("counter")}>Make a counter-offer</button></Choice>}
            <Choice title="Not happy with it?" text="Your Woreda trade office reviews your complaint and helps you settle.">
              <button className="btn btn--secondary" type="button" onClick={() => onOpen("escalate")}>Move it to the Woreda</button></Choice>
          </div>
        </div>
      );
    }
    case "meeting":
      return data.meeting ? (
        <Alert icon="calendar" title={data.meeting.title}>
          <p>{data.meeting.text}</p>
          <p><button className="btn btn--ghost btn--sm" type="button" onClick={() => onOpen("reschedule")}>Can&apos;t come? Ask for another time</button></p>
        </Alert>
      ) : null;
    case "settlement":
      return (
        <div className="card">
          <h2>Proposed solution<Am text="የቀረበ የመፍትሄ ሃሳብ" /></h2>
          {data.settlement && <KeyValue rows={data.settlement} />}
          <label className="check mt-4"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />{" "}
            <span>I accept this solution. When the refund is paid, my complaint is resolved.</span></label>
          <div className="btn-row">
            <button className="btn btn--accent" type="button" disabled={!agree} onClick={() => onAction({ type: "accept_settlement" })}>
              Accept the solution</button>
            <button className="btn btn--secondary" type="button" onClick={() => onOpen("decline")}>I do not accept</button>
          </div>
          <p className="small muted mb-0 mt-4">If you do not accept, tell the officer why. The City Bureau is the last level; it can try again with the business or refer the case.</p>
        </div>
      );
    case "info_required":
      return data.infoRequest ? (
        <div className="card">
          <h2>The officer asks you<Am text="መኮንኑ የጠየቁት" /></h2>
          <ul className="thread"><li className="office"><div className="meta"><b>{data.infoRequest.from}</b><time>{data.infoRequest.when}</time></div>
            <p>{data.infoRequest.text}</p><p className="mb-0"><b>Please reply by: {data.infoRequest.deadline}</b></p></li></ul>
          <form onSubmit={sendInfo} className="mt-4">
            <div className="field"><span className="label">Add files</span>
              <FileDrop id="info-files" title="Choose files" note="JPG, PNG or PDF · up to 10 MB each · up to 8 files" multiple
                onChange={e => checkFiles(e.target.files)} />
              {fileError && <p className="error-text show" role="alert">{fileError}</p>}
              {files > 0 && <p className="small muted" role="status">{files} file(s) ready to send.</p>}</div>
            <TextAreaField id="info-answer" name="answer" label="Your answer" required minLength={5} maxLength={1000} invalid="Write a short answer." />
            <button className="btn" type="submit" disabled={!!fileError}>Send the information</button>
          </form>
        </div>
      ) : null;
    case "outside":
      return data.outside ? (
        <div className="stack">
          <div className="card"><h2>Why this office cannot handle it<Am text="ለምን በዚህ ቢሮ አይታይም" /></h2>
            <ul className="thread"><li className="office"><div className="meta"><b>{data.outside.from}</b><time>{data.outside.when}</time></div>
              <p>{data.outside.text}</p></li></ul></div>
          <div className="card"><h2>Where you can go instead<Am text="ሌላ የት መሄድ ይችላሉ" /></h2>
            <ul className="link-list">{data.outside.alternatives.map(a => (
              <li key={a.title}><a href={a.href}><span style={{ flex: 1 }}><b>{a.title}</b><br /><span className="small muted">{a.text}</span></span></a></li>))}</ul></div>
          <form className="card" onSubmit={e => { e.preventDefault(); onAction({ type: "dispute_outside", text: String(new FormData(e.currentTarget).get("text") ?? "").trim() }); e.currentTarget.reset(); }}>
            <h2 style={{ fontSize: "1.1rem" }}>Think this is wrong?</h2>
            <TextAreaField id="out-text" name="text" label="Tell the officer why" required minLength={5} maxLength={500} invalid="Write a short message." />
            <button className="btn btn--secondary" type="submit">Send</button>
          </form>
        </div>
      ) : null;
    default:
      return null;
  }
}

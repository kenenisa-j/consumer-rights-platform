"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import type { CaseData } from "@/types/case";
import { KeyValue, Timeline, CallBox, type TimelineItem } from "@/components/ui/Display";
import { FileDrop, TextAreaField } from "@/components/ui/Field";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";

export function MessageThread({ data }: { data: CaseData }) {
  if (!data.thread.length) return null;
  return (
    <div className="card">
      <h2>Messages<Am text="መልዕክቶች" /></h2>
      <ul className="thread">
        {data.thread.map(m => (
          <li key={m.id} className={m.from === "me" ? undefined : "office"}>
            <div className="meta"><b>{m.who}</b><time>{m.when}</time></div><p>{m.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReplyForm({ counterpart, onSend, attach = true }: { counterpart: string; onSend: (text: string) => void; attach?: boolean }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    onSend(String(new FormData(form).get("message") ?? "").trim());
    form.reset();
  };
  return (
    <form className="card" onSubmit={submit}>
      <TextAreaField id="reply" name="message" label={`Write to ${counterpart}`} required minLength={2} maxLength={1000} invalid="Write a message first." />
      <div className="btn-row btn-row--split">
        {attach ? <FileDrop id="reply-file" title="Attach a file" note="JPG, PNG or PDF" /> : <span />}
        <button className="btn" type="submit">Send</button>
      </div>
    </form>
  );
}

export function UpdatesCard({ data }: { data: CaseData }) {
  const items: TimelineItem[] = data.updates.map((u, i) => ({
    title: u.title, when: u.when, iso: u.iso, text: u.text, state: i === 0 && !data.closed ? "now" : "done"
  }));
  return <div className="card"><h2>Updates<Am text="የሂደት መረጃ" /></h2><Timeline items={items} /></div>;
}

export function DetailsCard({ data }: { data: CaseData }) {
  const d = data.details;
  return (
    <div className="card">
      <h2>Your complaint<Am text="ቅሬታዎ" /></h2>
      <KeyValue rows={[["Problem", d.problem], ["Business", d.business], ["Bought", d.bought], ["Paid", d.paid], ["You asked for", d.asked]]} />
      <details className="mt-4"><summary>What you wrote</summary><p className="mt-4 mb-0">{d.narrative}</p></details>
    </div>
  );
}

export function CaseSide({ data, freeCall, onWithdraw }: { data: CaseData; freeCall: string; onWithdraw: () => void }) {
  return (
    <aside className="side">
      <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}><Icon name="pin" /> Handled by</h2>
        <KeyValue single rows={data.handledBy.map(([k, v]) => [k, v] as const)} />
        {data.stage === "business" && <p className="small muted mt-4 mb-0">The business never sees your name, phone or address.</p>}</div>
      <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}><Icon name="chat" /> Talk to them</h2>
        <p className="small">Write, or make an offer, in Messages.</p><Link className="btn btn--secondary btn--sm" href="/messages">Open Messages</Link></div>
      <CallBox freeCall={freeCall} text="Questions about your case? Call free." />
      {data.evidence.length > 0 && (
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}><Icon name="file" /> Your evidence</h2>
          <ul className="file-list link-list">{data.evidence.map(f => (
            <li key={f.name}><span style={{ flex: 1 }}><b>{f.name}</b><br /><small className="muted">{f.note} · {f.size}</small></span>
              <span className={`badge ${f.shared ? "badge--green" : ""}`.trim()}>{f.shared ? "Shared with the business" : "Officers only"}</span></li>))}</ul></div>
      )}
      {!data.closed && (
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Changed your mind?</h2>
          <p className="small">If the problem was solved another way, you can withdraw the complaint.</p>
          <button className="btn btn--danger btn--sm" type="button" onClick={onWithdraw}>Withdraw the complaint</button></div>
      )}
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { GovLevel } from "@/types/gov";
import { stamp } from "@/lib/stamp";
import { Alert, KeyValue, StatusPill, Timeline, type TimelineItem } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { applyTipAction, type GovTip, type TipAction } from "./tip-state";

type Dlg = "visit" | "send" | "case" | "close" | null;
const OFFICERS = ["Dawit Kebede", "Meron Tadesse"];
const WOREDAS = ["Woreda 3", "Woreda 5", "Woreda 7", "Woreda 9", "Woreda 11"];
const CATEGORIES = ["Price above the official ceiling", "Wrong weight or measure", "Expired products", "Other"];
const s = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const today = () => new Date().toISOString().slice(0, 10);
let caseCounter = 152; // demo only: the backend allocates real references

function F({ onSubmit, submit, onCancel, children }: { onSubmit: (d: FormData) => void; submit: string; onCancel: () => void; children: ReactNode }) {
  return (
    <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>
      {children}
      <div className="btn-row"><button className="btn btn--accent" type="submit">{submit}</button><button className="btn btn--secondary" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

/** One tip. The sender is anonymous, so there is nothing about them to show; the actions depend on the level. */
export function TipView({ initial, level }: { initial: GovTip; level: GovLevel }) {
  const [tip, setTip] = useState(initial);
  const latest = useRef(initial);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);

  const act = useCallback((a: TipAction) => {
    const r = applyTipAction(latest.current, level, a, stamp());
    latest.current = r.next; setTip(r.next); setNotice({ text: r.notice, ok: r.ok }); setDlg(null);
    if (r.ok) {
      const ref = tip.reference;
      try {
        if (a.type === "plan_visit") {
          fetch(`/api/government/tips/${ref}/visit`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduledDate: a.date, assignedOfficer: a.officer, notes: a.note }),
          }).catch(() => {});
        } else if (a.type === "send_to_woreda") {
          fetch(`/api/government/tips/${ref}/forward`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ woredaCode: a.woreda.replace(/[^0-9]/g, "") || a.woreda, notes: a.note }),
          }).catch(() => {});
        } else if (a.type === "make_case") {
          fetch(`/api/government/tips/${ref}/convert-to-case`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: a.category }),
          }).catch(() => {});
        } else if (a.type === "close") {
          const resCode = a.result.toLowerCase().includes("no action") ? "closed_no_action" : "closed_action_taken";
          fetch(`/api/government/tips/${ref}/close`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: resCode, notes: a.note }),
          }).catch(() => {});
        }
      } catch {
        // offline/mock fallback
      }
    }
  }, [level, tip.reference]);

  const items: TimelineItem[] = tip.history.map((h, i) => ({ title: h.title, when: h.when, iso: h.iso, text: h.text, state: i === 0 && !tip.closed ? "now" : "done" }));
  const open = !tip.closed && !tip.caseRef;
  return (
    <>
      <nav aria-label="You are here"><ol className="crumbs"><li><Link href={`/${level}/tips`}>Tips</Link></li><li aria-current="page">{tip.reference}</li></ol></nav>
      <div className="ws-title"><div><h1>{tip.title}</h1><p>{tip.reference} · <StatusPill tone={tip.closed ? "ok" : "info"}>{tip.status}</StatusPill> · Held by {tip.holder}</p></div></div>
      <div aria-live="polite" className="toast">{notice && <Alert tone={notice.ok ? "ok" : "bad"} icon={notice.ok ? "check" : "flag"} role="status" title={notice.text} />}</div>

      <div className="layout"><div className="stack">
        <div className="card"><h2>The tip</h2>
          <KeyValue rows={[["What was seen", tip.what], ["Where", tip.where], ["When", tip.seen], ["Came from", tip.source],
            ["Sender", "Anonymous. No name or phone was given."]]} />
          <p className="small muted mt-4 mb-0">The sender has a private code to check the tip. It is held only by the sender and is never shown to staff.</p></div>
        {tip.caseRef && <Alert tone="ok" icon="folder" title={`This tip became case ${tip.caseRef}`}>The sender stays anonymous. Follow it in Cases.</Alert>}
        <div className="card"><h2>History</h2><Timeline items={items} /></div>
      </div>
      <aside className="side">
        {open ? (
          <div className="card actions-card"><h2 style={{ fontSize: "1.05rem" }}>What do you want to do?</h2>
            {level === "woreda" && <button className="btn btn--secondary" type="button" onClick={() => setDlg("visit")}>Plan a visit</button>}
            {level === "subcity" && <button className="btn btn--secondary" type="button" onClick={() => setDlg("send")}>Send to a Woreda</button>}
            <button className="btn btn--accent" type="button" onClick={() => setDlg("case")}>{level === "subcity" ? "Make it a case here" : "Make it a case"}</button>
            <button className="btn btn--ghost" type="button" onClick={() => setDlg("close")}>Close the tip</button>
            {level === "bureau" && <p className="small muted mb-0">A tip you make into a case goes to the Woreda where it happened.</p>}
          </div>
        ) : <Alert icon="check" title={tip.closed ? "This tip is closed" : "Nothing more to do on this tip"}>The history keeps every step.</Alert>}
      </aside></div>

      <Dialog open={dlg === "visit"} onClose={() => setDlg(null)} title="Plan a visit">
        <F onCancel={() => setDlg(null)} submit="Plan the visit" onSubmit={d => act({ type: "plan_visit", date: s(d, "date"), officer: s(d, "officer"), note: s(d, "note") })}>
          <TextField id="pv-date" name="date" label="Date" type="date" min={today()} required invalid="Choose the date." />
          <SelectField id="pv-officer" name="officer" label="Officer" required options={OFFICERS} />
          <TextAreaField id="pv-note" name="note" label="What to check" required minLength={5} maxLength={400} invalid="Say what to check." />
        </F>
      </Dialog>
      <Dialog open={dlg === "send"} onClose={() => setDlg(null)} title="Send to a Woreda">
        <F onCancel={() => setDlg(null)} submit="Send the tip" onSubmit={d => act({ type: "send_to_woreda", woreda: s(d, "woreda"), note: s(d, "note") })}>
          <SelectField id="sw-woreda" name="woreda" label="Woreda" required options={WOREDAS} defaultValue="Woreda 7" />
          <TextAreaField id="sw-note" name="note" label="Note" optional maxLength={300} />
        </F>
      </Dialog>
      <Dialog open={dlg === "case"} onClose={() => setDlg(null)} title="Make it a case">
        <p>{level === "bureau" ? "The tip becomes a case and goes to the Woreda where it happened." : "The tip becomes a case at your office."} The person who sent it stays anonymous.</p>
        <F onCancel={() => setDlg(null)} submit="Make it a case" onSubmit={d => act({ type: "make_case", category: s(d, "category"), officer: s(d, "officer") || undefined, caseRef: `CC-2026-${String(++caseCounter).padStart(5, "0")}` })}>
          <SelectField id="mc-category" name="category" label="Category" required options={CATEGORIES} />
          {level !== "bureau" && <SelectField id="mc-officer" name="officer" label="Officer" required options={OFFICERS} />}
        </F>
      </Dialog>
      <Dialog open={dlg === "close"} onClose={() => setDlg(null)} title="Close the tip">
        <F onCancel={() => setDlg(null)} submit="Close the tip" onSubmit={d => act({ type: "close", result: s(d, "result"), note: s(d, "note") })}>
          <SelectField id="ct-result" name="result" label="Result" required options={["Closed, action taken", "Closed, no action"]} />
          <TextAreaField id="ct-note" name="note" label="Note" optional maxLength={400} />
        </F>
      </Dialog>
    </>
  );
}

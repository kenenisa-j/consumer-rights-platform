"use client";

import Link from "next/link";
import { useState } from "react";
import type { GovLevel } from "@/types/gov";
import { CALLS, CALL_INTRO, CALL_RESULTS, CALL_VIA_HEAD, type CallRow } from "@/mocks/gov-calls";
import { Alert } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Am } from "@/components/ui/Bi";
import { FREE_CALL_HOURS } from "@/lib/config";

/** The free call line log of one level. A call waiting for an answer can be recorded; others can become a complaint. */
export function CallsView({ level, freeCall }: { level: GovLevel; freeCall: string }) {
  const [rows, setRows] = useState<CallRow[]>(CALLS[level]);
  const [open, setOpen] = useState<CallRow | null>(null);
  const [saved, setSaved] = useState(false);

  const waiting = rows.filter(r => r.result === null).length;
  const became = rows.filter(r => r.ref || /complaint|tip/i.test(r.result ?? "")).length;

  const save = (data: FormData) => {
    if (!open) return;
    const result = String(data.get("result")), note = String(data.get("note") ?? "").trim();
    setRows(rs => rs.map(r => (r.id === open.id ? { ...r, result: `Called back: ${result.toLowerCase()}${note ? ` (${note})` : ""}` } : r)));
    setOpen(null); setSaved(true);
  };

  return (
    <>
      <div className="ws-title"><div><h1>Free call line<Am text="ነጻ የስልክ መስመር" /></h1><p>{CALL_INTRO[level]}</p></div></div>
      <div className="stack">
        {saved && <Alert tone="ok" icon="check" role="status" title="The call was saved." />}
        <div className="tiles">
          <div className="tile"><b>{rows.length}</b><span>Calls today</span></div>
          <div className="tile"><b>{rows.length - waiting}</b><span>Dealt with</span></div>
          <div className={`tile${waiting ? " tile--alert" : ""}`}><b>{waiting}</b><span>Waiting for a call back</span></div>
          <div className="tile"><b>{became}</b><span>Became a complaint or tip</span></div>
        </div>
        <div className="card">
          <h2>Today&apos;s calls</h2>
          <div className="table-wrap"><table className="table table--stack">
            <caption className="visually-hidden">Calls</caption>
            <thead><tr><th scope="col">Time</th><th scope="col">Caller</th><th scope="col">About</th><th scope="col">{CALL_VIA_HEAD[level]}</th><th scope="col">Result</th><th scope="col"><span className="visually-hidden">Action</span></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td>{r.time}</td><td data-label="Caller">{r.caller}</td><td data-label="About">{r.about}</td><td data-label={CALL_VIA_HEAD[level]}>{r.via}</td>
                <td data-label="Result">{r.result ?? <span className="status status--warn">Waiting</span>}</td>
                <td className="num">{r.result === null
                  ? <button className="btn btn--accent btn--sm" type="button" onClick={() => setOpen(r)}>Call back</button>
                  : <Link className="btn btn--secondary btn--sm" href={`/${level}/intake`}>Make a complaint</Link>}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
        <div className="call-box"><Icon name="phone" /><div><b>The free line</b><a className="call-box__num" href={`tel:${freeCall}`}>{freeCall}</a>
          <span className="small muted">{FREE_CALL_HOURS.en}. Answered by the City Bureau. Calls about your area come to you.</span></div></div>
      </div>

      <Dialog open={!!open} onClose={() => setOpen(null)} title="Record the call back">
        <p>Write down what was agreed on the call with {open?.caller}.</p>
        <form onSubmit={e => { e.preventDefault(); save(new FormData(e.currentTarget)); }}>
          <SelectField id="cb-result" name="result" label="Result" required options={CALL_RESULTS[level]} />
          <TextAreaField id="cb-note" name="note" label="Note" optional maxLength={300} />
          <div className="btn-row"><button className="btn" type="submit">Save the call</button>
            <button className="btn btn--secondary" type="button" onClick={() => setOpen(null)}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}

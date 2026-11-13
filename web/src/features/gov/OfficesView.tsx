"use client";

import { useState, type FormEvent } from "react";
import type { GovLevel } from "@/types/gov";
import { OFFICE, PATH, PLACES } from "@/mocks/gov-admin";
import { Alert, KeyValue } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";

// The hyphen is escaped: browsers compile `pattern` with the `v` flag, where a bare "-" in a class is a syntax error
// and an invalid pattern is silently ignored (the field would accept anything).
const PHONE = String.raw`0[0-9]{2,3}[ \-]?[0-9]{3}[ \-]?[0-9]{3,4}|(\+251 ?)[0-9]( ?[0-9]){8}`;
const EDITABLE = ["Address", "Phone", "Open", "Meeting room"];

/** The office, where it sits on the path, and the places it covers. Woreda and Sub-City can edit their own details. */
export function OfficesView({ level }: { level: GovLevel }) {
  const info = OFFICE[level];
  const [rows, setRows] = useState(info.rows);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const places = PLACES[level];
  const value = (k: string) => rows.find(([key]) => key === k)?.[1] ?? "";

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setRows(rs => rs.map(([k, v]) => [k, EDITABLE.includes(k) ? String(d.get(k) ?? v).trim() : v] as [string, string]));
    setOpen(false); setSaved(true);
  };

  return (
    <>
      <div className="ws-title"><div><h1>Offices</h1><p>{level === "bureau" ? "The path a complaint takes, and who holds it at each step" : "Your office, where it sits on the path, and the places you cover"}</p></div>
        {info.editable && <button className="btn btn--accent" type="button" onClick={() => setOpen(true)}>Edit office details</button>}</div>
      <div className="stack">
        {saved && <Alert tone="ok" icon="check" role="status" title="Office details saved." >They show to consumers who are sent to you.</Alert>}
        <div className="card"><h2>{level === "bureau" ? "From the business to the last level" : "Where you sit on the path"}</h2>
          <ol className="chain">{PATH[level].map(s => <li key={s.name} className={s.here ? "now" : "done"}><b>{s.name}</b><span>{s.note}</span></li>)}</ol></div>
        {info.editable && <div className="card"><h2>Your office</h2><KeyValue rows={rows.map(([k, v]) => [k, v] as const)} /></div>}
        <div className="card"><h2>{places.title}</h2>
          <div className="table-wrap"><table className="table table--stack"><caption className="visually-hidden">{places.title}</caption>
            <thead><tr>{places.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>{places.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i} data-label={places.head[i]}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody></table></div></div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Edit office details">
        <form onSubmit={save}>
          <TextField id="of-address" name="Address" label="Address" required maxLength={160} defaultValue={value("Address")} invalid="Write the address." />
          <TextField id="of-phone" name="Phone" label="Phone" type="tel" required pattern={PHONE} defaultValue={value("Phone")} invalid="Write a phone number such as 0116 000 707." />
          <TextField id="of-room" name="Meeting room" label="Meeting room" maxLength={60} defaultValue={value("Meeting room")} />
          <TextField id="of-hours" name="Open" label="Open" required maxLength={80} defaultValue={value("Open")} invalid="Write the opening hours." />
          <div className="btn-row"><button className="btn" type="submit">Save</button><button className="btn btn--secondary" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}

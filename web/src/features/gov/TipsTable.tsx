"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GovLevel } from "@/types/gov";
import { TIP_FILTERS, TIP_ROWS } from "@/mocks/gov-tips";

export function TipsTable({ level }: { level: GovLevel }) {
  const [group, setGroup] = useState("all");
  const rows = TIP_ROWS[level];
  const shown = useMemo(() => rows.filter(r => group === "all" || r.group === group), [rows, group]);
  return (
    <div className="stack">
      <div className="chips" role="radiogroup" aria-label="Show">
        {TIP_FILTERS[level].map(f => <label key={f.value}><input type="radio" name="tip-filter" checked={group === f.value} onChange={() => setGroup(f.value)} /> {f.label}</label>)}
      </div>
      <p className="result-count" role="status">{shown.length} of {rows.length} tips</p>
      <div className="table-wrap"><table className="table table--stack">
        <caption className="visually-hidden">Tips</caption>
        <thead><tr><th scope="col">Tip</th><th scope="col">Where</th><th scope="col">Came from</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
        <tbody>{shown.map(r => (
          <tr key={r.reference}>
            <td>{r.hasDetail ? <Link href={`/${level}/tips/${r.reference}`}><b>{r.reference}</b></Link> : <b>{r.reference}</b>}<small>{r.title}</small></td>
            <td data-label="Where">{r.where}</td><td data-label="Came from">{r.source}</td>
            <td data-label="Status"><span className={`status${r.status === "Received" ? " status--warn" : ""}`}>{r.status}</span></td>
            <td className="num">{r.hasDetail ? <Link className="btn btn--secondary btn--sm" href={`/${level}/tips/${r.reference}`}>Open</Link>
              : <span className="small muted" title="This demo tip has no detail page">No demo detail</span>}</td>
          </tr>))}</tbody>
      </table></div>
    </div>
  );
}

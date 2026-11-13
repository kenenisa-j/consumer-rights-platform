"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BizSummary } from "@/types/biz";
import { StatusPill } from "@/components/ui/Display";

const FILTERS = [{ value: "all", label: "All" }, { value: "reply", label: "Reply needed" }, { value: "officer", label: "With the officer" }, { value: "done", label: "Resolved" }];

export function BizComplaintsTable({ rows }: { rows: BizSummary[] }) {
  const [group, setGroup] = useState("all");
  const shown = useMemo(() => rows.filter(r => group === "all" || r.group === group), [rows, group]);
  return (
    <div className="stack">
      <div className="chips" role="radiogroup" aria-label="Show">
        {FILTERS.map(f => <label key={f.value}><input type="radio" name="biz-filter" checked={group === f.value} onChange={() => setGroup(f.value)} /> {f.label}</label>)}
      </div>
      <p className="result-count" role="status">{shown.length} of {rows.length} complaints</p>
      <div className="table-wrap"><table className="table table--stack">
        <caption className="visually-hidden">Complaints about this business</caption>
        <thead><tr><th scope="col">Complaint</th><th scope="col">Consumer</th><th scope="col">Status</th><th scope="col">Your deadline</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
        <tbody>{shown.map(r => (
          <tr key={r.reference}>
            <td>{r.hasDetail ? <Link href={`/business/complaints/${r.reference}`}><b>{r.reference}</b></Link> : <b>{r.reference}</b>}<small>{r.title}</small></td>
            <td data-label="Consumer">{r.alias}</td><td data-label="Status"><StatusPill tone={r.status.tone}>{r.status.label}</StatusPill></td>
            <td data-label="Your deadline">{r.action ? <span className="due">{r.deadline}</span> : r.deadline}</td>
            <td className="num">{r.hasDetail ? <Link className="btn btn--accent btn--sm" href={`/business/complaints/${r.reference}`}>Reply</Link>
              : <span className="small muted" title="This demo complaint has no detail page">No demo detail</span>}</td>
          </tr>))}</tbody>
      </table></div>
    </div>
  );
}

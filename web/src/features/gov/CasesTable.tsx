"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CaseRow, GovLevel } from "@/types/gov";
import { CASE_COLUMNS } from "@/mocks/gov-lists";
import { LEVELS } from "./levels";

/** The cases of one level: filter by group, search by number, title or business. */
export function CasesTable({ level, rows }: { level: GovLevel; rows: CaseRow[] }) {
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const filters = LEVELS[level].caseFilters;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => (group === "all" || r.group === group) &&
      (!q || `${r.reference} ${r.title} ${r.business}`.toLowerCase().includes(q)));
  }, [rows, group, query]);

  return (
    <div className="stack">
      <div className="search-row">
        <div className="field">
          <label htmlFor="case-q">Search cases</label>
          <input id="case-q" className="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Number, title or business" />
        </div>
      </div>
      <div className="chips" role="radiogroup" aria-label="Show">
        {filters.map(f => (
          <label key={f.value}><input type="radio" name="case-filter" checked={group === f.value} onChange={() => setGroup(f.value)} /> {f.label}</label>
        ))}
      </div>
      <p className="result-count" role="status">{shown.length} of {rows.length} cases</p>
      {shown.length === 0 ? <div className="card center"><p className="mb-0">No case matches. Clear the search or choose All.</p></div> : (
        <div className="table-wrap"><table className="table table--stack">
          <caption className="visually-hidden">Cases</caption>
          <thead><tr><th scope="col">Case</th><th scope="col">Business</th><th scope="col">{CASE_COLUMNS[level]}</th><th scope="col">Status</th><th scope="col">Open for</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
          <tbody>{shown.map(r => (
            <tr key={r.reference}>
              <td>{r.hasDetail ? <Link href={`/${level}/cases/${r.reference}`}><b>{r.reference}</b></Link> : <b>{r.reference}</b>}<small>{r.title}</small></td>
              <td data-label="Business">{r.business}</td><td data-label={CASE_COLUMNS[level]}>{r.via}</td>
              <td data-label="Status">{r.action ? <span className="status status--warn">{r.status}</span> : <span className="status">{r.status}</span>}</td>
              <td data-label="Open for">{r.open}</td>
              <td className="num">{r.hasDetail
                ? <Link className={`btn btn--sm ${r.action ? "btn--accent" : "btn--secondary"}`} href={`/${level}/cases/${r.reference}`}>Open</Link>
                : <span className="small muted" title="This demo case has no detail page">No demo detail</span>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { LAWS, LAW_KINDS, type LawKind } from "@/content/library";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

/** Filter by type and search by words. Downloads are placeholders until the content module exists. */
export function LawsList() {
  const [kind, setKind] = useState<LawKind | "all">("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LAWS.filter(d => (kind === "all" || d.kind === kind) &&
      (!q || `${d.title} ${d.text} ${d.source}`.toLowerCase().includes(q)));
  }, [kind, query]);

  return (
    <>
      <div className="search-row">
        <div className="field">
          <label htmlFor="law-q">Search the documents</label>
          <input id="law-q" className="input" type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="For example: price, complaint, weights" />
        </div>
      </div>
      <div className="chips" role="radiogroup" aria-label="Show">
        {LAW_KINDS.map(k => (
          <label key={k.value}>
            <input type="radio" name="kind" checked={kind === k.value} onChange={() => setKind(k.value)} /> {k.label}
          </label>
        ))}
      </div>
      <p className="result-count" role="status">{shown.length} of {LAWS.length} documents</p>
      <div className="doc-list">
        {shown.map(d => (
          <article key={d.id} className="card card--flat doc">
            <span className="icon-bubble"><Icon name="file" /></span>
            <div>
              <Badge tone={d.kind === "proc" ? "orange" : d.kind === "dir" ? "green" : undefined}>{d.kindLabel}</Badge>
              <h3>{d.title}</h3>
              <p>{d.text}</p>
              <p className="small muted">{d.source} · <span className="badge badge--later">PDF coming soon</span></p>
            </div>
          </article>
        ))}
        {shown.length === 0 && <div className="card center"><p className="mb-0">No document matches. Try fewer words or choose All.</p></div>}
      </div>
    </>
  );
}

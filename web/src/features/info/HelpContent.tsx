"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OFFICE_HOURS } from "@/content/help";
import type { FaqItem } from "@/lib/content";
import { Accordion, CallBox } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";

/** Searchable questions and an office finder. `?subcity=` (from the home page dialog) pre-selects an office. */
export function HelpContent({ freeCall, faq, subcities }: { freeCall: string; faq: FaqItem[]; subcities: string[] }) {
  const params = useSearchParams();
  const initial = params.get("subcity") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? ""); // the header search sends ?q=
  const [area, setArea] = useState(subcities.includes(initial) ? initial : "");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faq.filter(i => !q || `${i.q.en} ${i.a}`.toLowerCase().includes(q))
      .map(i => ({ id: i.slug, q: i.q, a: i.a.replace("{call}", freeCall) }));
  }, [faq, query, freeCall]);

  const offices = [{ area: "Bureau", name: "Customer Rights Protection Directorate, Bureau of Trade, central office" },
    ...subcities.map(s => ({ area: s, name: `${s} Sub-City Trade Office, consumer protection desk` }))]
    .filter(o => !area || o.area === area || o.area === "Bureau");

  return (
    <div className="stack">
      <CallBox freeCall={freeCall} text="Call the free line to make a complaint or ask a question." />

      <div>
        <h2>Questions and answers<Am text="ጥያቄና መልስ" /></h2>
        <div className="search-row">
          <div className="field">
            <label htmlFor="faq-q">Search the questions</label>
            <input id="faq-q" className="input" type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="For example: receipt, cost, password" />
          </div>
        </div>
        <p className="result-count" role="status">{items.length} of {faq.length} questions</p>
        {items.length ? <Accordion items={items} /> : (
          <div className="card center"><p className="mb-0">No question matches. Try another word, or call free on {freeCall}.</p></div>
        )}
      </div>

      <div id="offices">
        <h2>Offices<Am text="ቢሮዎች" /></h2>
        <p>Each Sub-City and Woreda trade office takes complaints at its desk. Phone numbers and addresses will be added once confirmed.</p>
        <div className="search-row">
          <div className="field">
            <label htmlFor="office-area">Show the office for</label>
            <select id="office-area" className="select" value={area} onChange={e => setArea(e.target.value)}>
              <option value="">All Sub-Cities</option>
              {subcities.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap"><table className="table table--stack">
          <caption className="visually-hidden">Sub-City trade offices</caption>
          <thead><tr><th scope="col">Office</th><th scope="col">Phone</th><th scope="col">Open</th></tr></thead>
          <tbody>{offices.map(o => (
            <tr key={o.area}><td><b>{o.area}</b><small>{o.name}</small></td>
              <td data-label="Phone">Ask at the desk</td><td data-label="Open">{OFFICE_HOURS}</td></tr>))}</tbody>
        </table></div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FAQ_ITEMS, OFFICES, OFFICE_HOURS } from "@/content/help";
import { SUB_CITIES } from "@/content/common";
import { Accordion, CallBox } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";

/** Searchable questions and an office finder. `?subcity=` (from the home page dialog) pre-selects an office. */
export function HelpContent({ freeCall }: { freeCall: string }) {
  const params = useSearchParams();
  const initial = params.get("subcity") ?? "";
  const [query, setQuery] = useState("");
  const [area, setArea] = useState(SUB_CITIES.includes(initial as never) ? initial : "");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter(i => !q || `${i.q.en} ${i.a}`.toLowerCase().includes(q))
      .map(i => ({ id: i.id, q: i.q, a: i.a.replace("{call}", freeCall) }));
  }, [query, freeCall]);

  const offices = OFFICES.filter(o => !area || o.area === area || o.area === "Bureau");

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
        <p className="result-count" role="status">{items.length} of {FAQ_ITEMS.length} questions</p>
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
              {SUB_CITIES.map(s => <option key={s}>{s}</option>)}
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

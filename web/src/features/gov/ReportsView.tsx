"use client";

import type { CSSProperties } from "react";
import type { GovLevel } from "@/types/gov";
import { REPORTS, reportCsv } from "@/mocks/gov-reports";
import { Alert } from "@/components/ui/Display";

/** Figures for one level, with a CSV download so the numbers can be opened in a spreadsheet. */
export function ReportsView({ level }: { level: GovLevel }) {
  const report = REPORTS[level];
  const download = () => {
    const url = URL.createObjectURL(new Blob(["﻿" + reportCsv(report)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `consumer-protection-report-${level}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <div className="ws-title" style={{ marginBottom: 0 }}>
        <div><h1>Reports</h1><p>{report.range}</p></div>
        <button className="btn btn--secondary" type="button" onClick={download}>Download as CSV</button>
      </div>
      <Alert icon="chart" title="Sample figures">These numbers are worked out once for the demo so the totals agree. The live report counts the real cases.</Alert>
      <div className="tiles">{report.tiles.map(t => <div key={t.label} className="tile"><b>{t.value}</b><span>{t.label}</span></div>)}</div>
      <div className="grid-2">
        {report.sections.map(s => {
          const max = Math.max(...(s.bars ?? []).map(b => b.value), 1);
          return (
            <div key={s.title} className="card">
              <h2>{s.title}</h2>
              {s.bars && <div className="bars">{s.bars.map(b => (
                <div className="bar bar--orange" key={b.label}><span className="bar__label">{b.label}</span>
                  <span className="bar__track"><i style={{ "--v": Math.round((b.value / max) * 100) } as CSSProperties} /></span><b>{b.value}</b></div>))}</div>}
              {s.table && <div className="table-wrap"><table className="table">
                <thead><tr>{s.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>}
              {s.note && <p className="small muted mb-0 mt-4">{s.note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

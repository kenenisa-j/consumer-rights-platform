import type { GovLevel } from "@/types/gov";

// Report figures per level (prototype/{woreda,subcity,bureau}/reports.html). Sample figures worked out once so the
// totals agree; every report page says so. Real numbers are computed by the backend from the data.
export interface ReportSection { title: string; note?: string; bars?: { label: string; value: number }[]; table?: { head: string[]; rows: string[][] } }
export interface Report { range: string; tiles: { value: string; label: string }[]; sections: ReportSection[] }

const CATEGORIES = [{ label: "Wrong weight or measure", value: 34 }, { label: "Defective or substandard goods", value: 26 }, { label: "Price above the official ceiling", value: 21 },
  { label: "Expired products", value: 13 }, { label: "Other", value: 6 }];

export const REPORTS: Record<GovLevel, Report> = {
  woreda: {
    range: "Woreda 7, Akaki Kality · 1 January to 9 November 2026",
    tiles: [{ value: "38", label: "Received" }, { value: "27", label: "Resolved here (71%)" }, { value: "320,000 ETB", label: "returned to consumers" }, { value: "6 days", label: "Average to resolve" }],
    sections: [
      { title: "By category", note: "Share of complaints, in per cent.", bars: CATEGORIES },
      { title: "What happened to them", bars: [{ label: "Resolved at the Woreda", value: 27 }, { label: "Passed up to the Sub-City", value: 6 }, { label: "Still open", value: 5 }] },
      { title: "By market", bars: [{ label: "Market 097 ቃሊቲ ገብርኤል", value: 18 }, { label: "Kality Sunday Market", value: 11 }, { label: "Gelan road shops", value: 9 }] },
      { title: "Outcomes", table: { head: ["Outcome", "Cases"], rows: [["Refund", "14"], ["Replacement", "7"], ["Repair", "3"], ["Other agreement", "3"]] } }]
  },
  subcity: {
    range: "Akaki Kality Sub-City · 1 January to 9 November 2026",
    tiles: [{ value: "96", label: "Reached the Sub-City" }, { value: "71", label: "Resolved here (74%)" }, { value: "610,000 ETB", label: "returned to consumers" }, { value: "8 days", label: "Average to resolve" }],
    sections: [
      { title: "By category", note: "Share of complaints, in per cent.", bars: CATEGORIES },
      { title: "What happened to them", bars: [{ label: "Resolved at the Sub-City", value: 71 }, { label: "Passed up to the City Bureau", value: 15 }, { label: "Still open", value: 10 }] },
      { title: "Passed up by each Woreda", bars: [{ label: "Woreda 3", value: 21 }, { label: "Woreda 5", value: 17 }, { label: "Woreda 7", value: 24 }, { label: "Woreda 9", value: 19 }, { label: "Woreda 11", value: 15 }] },
      { title: "Outcomes", table: { head: ["Outcome", "Cases"], rows: [["Refund", "38"], ["Replacement", "18"], ["Repair", "9"], ["Other agreement", "6"]] } }]
  },
  bureau: {
    range: "Complaints received 1 January to 7 November 2026, the whole city",
    tiles: [{ value: "412", label: "Received" }, { value: "318", label: "Resolved (77%)" }, { value: "1.24 M ETB", label: "returned to consumers" }, { value: "9 days", label: "Average to resolve" }],
    sections: [
      { title: "By category", bars: [{ label: "Wrong weight or measure", value: 128 }, { label: "Defective or substandard goods", value: 111 }, { label: "Price above the official ceiling", value: 74 },
        { label: "Expired products", value: 49 }, { label: "Service complaint", value: 33 }, { label: "Other", value: 17 }] },
      { title: "Who resolved them", bars: [{ label: "Settled with the business", value: 121 }, { label: "Woreda", value: 108 }, { label: "Sub-City", value: 35 }, { label: "City Bureau", value: 54 }] },
      { title: "Outcomes", table: { head: ["Outcome", "Cases", "Amount (ETB)"], rows: [["Refund", "142", "1,240,000"], ["Replacement", "71", "n/a"], ["Repair", "39", "n/a"], ["Other agreement", "66", "n/a"]] } }]
  }
};

/** A plain CSV of one report, for people who need the numbers in a spreadsheet. */
export function reportCsv(report: Report): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [[q("Report"), q(report.range)].join(",")];
  for (const t of report.tiles) lines.push([q(t.label), q(t.value)].join(","));
  for (const s of report.sections) {
    lines.push("", q(s.title));
    if (s.bars) for (const b of s.bars) lines.push([q(b.label), q(b.value)].join(","));
    if (s.table) { lines.push(s.table.head.map(q).join(",")); for (const r of s.table.rows) lines.push(r.map(q).join(",")); }
  }
  return lines.join("\n");
}

// Prototype: woreda|subcity|bureau/cases.html
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_ROWS, CASE_TILES } from "@/mocks/gov-lists";
import { CasesTable } from "@/features/gov/CasesTable";
import { isGovLevel } from "@/features/gov/levels";
import type { CaseRow } from "@/types/gov";

export const metadata = { title: "Cases" };

const INTRO = {
  woreda: "Complaints held by your Woreda trade office",
  subcity: "Complaints your Sub-City trade department coordinates",
  bureau: "Every complaint across the city bureau and subordinate offices",
} as const;

export default async function CasesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();

  let rows: CaseRow[] = CASE_ROWS[level];
  let tiles = CASE_TILES[level];

  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const res = await fetch(`${API_URL}/api/government/cases?limit=50`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        const list = body?.cases;
        if (Array.isArray(list) && list.length > 0) {
          const liveRows: CaseRow[] = list.map((c: any) => {
            const isAction =
              c.isPendingAcceptance ||
              c.status === "RECEIVED_BY_OFFICE" ||
              c.status === "ESCALATED_TO_GOVERNMENT";
            const isClosed =
              c.status === "RESOLVED_MUTUALLY" ||
              c.status === "RESOLVED_ADMINISTRATIVE_ORDER" ||
              c.status === "COURT_REFERRAL_ISSUED" ||
              c.status === "CLOSED_OUTSIDE_JURISDICTION" ||
              c.status === "CLOSED_WITHDRAWN";
            const daysOpen = Math.max(
              1,
              Math.round((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 3600 * 24))
            );

            return {
              reference: c.referenceNumber,
              title: c.itemDescription,
              business: c.merchantName || "Business",
              via: c.officeName || "Direct Intake",
              status: c.status.replace(/_/g, " ").toLowerCase(),
              open: `${daysOpen} day${daysOpen === 1 ? "" : "s"}`,
              group: isAction ? "action" : isClosed ? "closed" : "progress",
              action: isAction,
              hasDetail: true,
            };
          });

          const seen = new Set(liveRows.map(r => r.reference));
          const demoFallback = CASE_ROWS[level].filter(r => !seen.has(r.reference));
          rows = [...liveRows, ...demoFallback];

          const actionCount = rows.filter(r => r.action).length;
          const progressCount = rows.filter(r => r.group === "progress").length;
          const closedCount = rows.filter(r => r.group === "closed").length;
          const overdueCount = list.filter((c: any) => c.slaDeadline && new Date(c.slaDeadline) < new Date()).length;

          tiles = [
            { value: String(actionCount), label: "Need your action" },
            { value: String(progressCount), label: "In progress" },
            { value: String(closedCount), label: "Closed" },
            { value: String(overdueCount), label: "Overdue" },
          ];
        }
      }
    }
  } catch {
    // fallback to demo mock data
  }

  return (
    <>
      <div className="ws-title">
        <div><h1>Cases</h1><p>{INTRO[level]}</p></div>
        <Link className="btn btn--accent" href={`/${level}/intake`}>New complaint</Link>
      </div>
      <div className="tiles">{tiles.map(t => <div key={t.label} className="tile"><b>{t.value}</b><span>{t.label}</span></div>)}</div>
      <CasesTable level={level} rows={rows} />
    </>
  );
}

import { cookies } from "next/headers";
import Link from "next/link";
import { API_URL, requirePortal } from "@/lib/session";
import { Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { BIZ_LIST } from "@/mocks/biz-cases";
import { BizComplaintsTable } from "@/features/business/BizComplaintsTable";
import { BUSINESS } from "@/features/business/menu";
import type { BizSummary } from "@/types/biz";

export const metadata = { title: "Consumer complaints" };

async function fetchBusinessComplaints(): Promise<BizSummary[]> {
  try {
    const jar = await cookies();
    const res = await fetch(`${API_URL}/api/business/cases`, {
      headers: { cookie: jar.toString() },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const list = data?.cases;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c: any) => {
          const isReplyNeeded = c.status === "SUBMITTED_TO_BUSINESS";
          const isWithOfficer = c.status === "RECEIVED_BY_OFFICE" || c.status === "UNDER_INITIAL_REVIEW" || c.status === "OFFICER_ASSIGNED" || c.status === "ESCALATED_TO_GOVERNMENT";
          const isDone = c.status === "RESOLVED_MUTUALLY" || c.status === "RESOLVED_ADMINISTRATIVE_ORDER" || c.status === "CLOSED_WITHDRAWN" || c.status === "CLOSED_OUTSIDE_JURISDICTION";

          const group = isReplyNeeded ? "reply" : isWithOfficer ? "officer" : "done";
          const tone = isReplyNeeded ? "warn" : isDone ? "ok" : "info";
          const label = isReplyNeeded ? "Reply needed" : isWithOfficer ? "With the officer" : isDone ? "Resolved" : c.status.replace(/_/g, " ").toLowerCase();

          return {
            reference: c.reference,
            title: c.title,
            alias: c.complainant || "Consumer",
            status: { label, tone },
            deadline: c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : (isReplyNeeded ? "Action needed" : "No action needed"),
            group,
            action: isReplyNeeded,
            hasDetail: true,
          };
        });
      }
    }
  } catch {
    // offline/mock fallback
  }
  return BIZ_LIST;
}

// Prototype: merchant/complaints.html. Only complaints about this business are shown, with the consumer as a number.
export default async function BizComplaintsPage() {
  const me = await requirePortal("business", "/business/complaints");
  const rows = await fetchBusinessComplaints();
  const waiting = rows.filter(r => r.action);
  const withOfficer = rows.filter(r => r.group === "officer");
  const resolved = rows.filter(r => r.group === "done");
  const businessName = me.business?.tradeName || BUSINESS.name;

  return (
    <>
      <div className="ws-title"><div><h1>Consumer complaints<Am text="የሸማቾች ቅሬታዎች" /></h1>
        <p>Complaints that consumers have made about {businessName}. Only your own business is shown.</p></div></div>
      <div className="tiles">
        <div className={`tile ${waiting.length > 0 ? "tile--alert" : ""}`}><b>{waiting.length}</b><span>Needs your reply</span></div>
        <div className="tile"><b>{withOfficer.length}</b><span>With the officer</span></div>
        <div className="tile"><b>{resolved.length}</b><span>Resolved this month</span></div>
        <div className="tile"><b>2 days</b><span>Usual time to reply</span></div>
      </div>
      <div className="stack">
        {waiting.length > 0 && <Alert tone="warn" icon="folder" title={`${waiting.length} complaint${waiting.length === 1 ? " is" : "s are"} waiting for your reply`}>
          {waiting.map(w => <p key={w.reference} className="mb-0">{w.reference}: please reply by {w.deadline}. <Link href={`/business/complaints/${w.reference}`}>Open it</Link></p>)}</Alert>}
        <BizComplaintsTable rows={rows} />
      </div>
    </>
  );
}

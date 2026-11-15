import Link from "next/link";
import { Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { serverGet } from "@/lib/server-api";
import { niceDate, statusOf } from "@/lib/case-status";
import type { BizSummary } from "@/types/biz";
import { BizComplaintsTable } from "@/features/business/BizComplaintsTable";
import { getMe } from "@/lib/session";

export const metadata = { title: "Consumer complaints" };

interface BizCase { reference: string; title: string; status: string; consumer: string; dueBy: string | null }
const REPLY = new Set(["SUBMITTED_TO_BUSINESS", "BUSINESS_OFFER_PENDING"]);

// Prototype: merchant/complaints.html. Only complaints about this business, read from the database, with the consumer as a number.
export default async function BizComplaintsPage() {
  const [cases, me] = await Promise.all([serverGet<BizCase[]>("/business/complaints"), getMe()]);
  const rows: BizSummary[] = (cases ?? []).map(c => {
    const st = statusOf(c.status);
    const reply = REPLY.has(c.status);
    return { reference: c.reference, title: c.title, alias: c.consumer, status: { label: st.label, tone: st.tone }, deadline: c.dueBy ? niceDate(c.dueBy) : "—",
      group: reply ? "reply" : st.stage === "resolved" ? "done" : "officer", action: reply, hasDetail: true };
  });
  const waiting = rows.filter(r => r.action);
  return (
    <>
      <div className="ws-title"><div><h1>Consumer complaints<Am text="የሸማቾች ቅሬታዎች" /></h1>
        <p>Complaints that consumers have made about {me?.business?.tradeName ?? "your business"}. Only your own business is shown.</p></div></div>
      {cases === null ? <Alert tone="warn" icon="flag" title="We could not load the complaints.">Try again in a moment.</Alert> : (
        <>
          <div className="tiles">
            <div className="tile tile--alert"><b>{waiting.length}</b><span>Needs your reply</span></div><div className="tile"><b>{rows.filter(r => r.group === "officer").length}</b><span>With the officer</span></div>
            <div className="tile"><b>{rows.filter(r => r.group === "done").length}</b><span>Resolved</span></div><div className="tile"><b>{rows.length}</b><span>In all</span></div>
          </div>
          <div className="stack">
            {waiting.length > 0 && <Alert tone="warn" icon="folder" title={`${waiting.length} ${waiting.length === 1 ? "complaint is" : "complaints are"} waiting for your reply`}>
              {waiting.map(w => <p key={w.reference} className="mb-0">{w.reference}: reply by {w.deadline}. <Link href={`/business/complaints/${w.reference}`}>Open it</Link></p>)}</Alert>}
            {rows.length === 0 ? <div className="card center"><p className="mb-0">No consumer has complained about your business.</p></div> : <BizComplaintsTable rows={rows} />}
          </div>
        </>
      )}
    </>
  );
}

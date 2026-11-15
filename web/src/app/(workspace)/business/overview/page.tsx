import Link from "next/link";
import { Alert, StatusPill } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { requirePortal } from "@/lib/session";
import { serverGet } from "@/lib/server-api";
import { niceDate, statusOf } from "@/lib/case-status";

export const metadata = { title: "Overview" };

interface BizCase { reference: string; title: string; status: string; consumer: string; dueBy: string | null; updatedAt: string; amount: number }
const REPLY = new Set(["SUBMITTED_TO_BUSINESS", "BUSINESS_OFFER_PENDING"]);

// The business's front page: what waits for a reply, then the latest complaints. Everything comes from the database.
export default async function BusinessOverviewPage() {
  const me = await requirePortal("business", "/business/overview");
  const cases = await serverGet<BizCase[]>("/business/complaints");
  const all = cases ?? [];
  const waiting = all.filter(c => REPLY.has(c.status));
  const withOfficer = all.filter(c => !REPLY.has(c.status) && statusOf(c.status).stage !== "resolved");
  const done = all.filter(c => statusOf(c.status).stage === "resolved");
  const name = me.business?.tradeName ?? "your business";
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Addis_Ababa" }).format(new Date()));
  return (
    <>
      <div className="ws-title"><div><h1>{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, {me.fullName.split(" ")[0]}<Am text="እንኳን ደህና መጡ" /></h1>
        <p>{niceDate(new Date().toISOString())} · {name}</p></div></div>
      <div className="stack">
        {cases === null && <Alert tone="warn" icon="flag" title="We could not load your complaints.">Try again in a moment.</Alert>}
        {waiting.length > 0 && (
          <Alert tone="warn" icon="folder" title={`${waiting.length} consumer ${waiting.length === 1 ? "complaint needs" : "complaints need"} your reply`}>
            {waiting.slice(0, 3).map(w => <p key={w.reference} className="mb-0">{w.reference}: {w.title}. <Link href={`/business/messages?case=${w.reference}`}>Reply</Link> · <Link href={`/business/complaints/${w.reference}`}>Open it</Link></p>)}
          </Alert>
        )}
        <div className="tiles">
          <div className={`tile${waiting.length ? " tile--alert" : ""}`}><b>{waiting.length}</b><span>Need your reply</span></div>
          <div className="tile"><b>{withOfficer.length}</b><span>With an officer</span></div>
          <div className="tile"><b>{done.length}</b><span>Resolved</span></div>
          <div className="tile"><b>{all.length}</b><span>Complaints in all</span></div>
        </div>
        <div className="card"><h2>Latest complaints</h2>
          {all.length === 0 ? <p className="mb-0 muted">No consumer has complained about your business.</p> : (
            <div className="table-wrap"><table className="table table--stack">
              <thead><tr><th scope="col">Complaint</th><th scope="col">Consumer</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
              <tbody>{all.slice(0, 5).map(c => (
                <tr key={c.reference}>
                  <td><b>{c.reference}</b><small>{c.title}</small></td><td data-label="Consumer">{c.consumer}</td>
                  <td data-label="Status"><StatusPill tone={statusOf(c.status).tone}>{statusOf(c.status).label}</StatusPill></td>
                  <td data-label="Updated">{niceDate(c.updatedAt)}</td>
                  <td className="num"><Link className="btn btn--secondary btn--sm" href={`/business/complaints/${c.reference}`}>Open</Link></td>
                </tr>))}</tbody>
            </table></div>
          )}
          <p className="mt-4 mb-0"><Link href="/business/complaints">All complaints</Link> · <Link href="/business/messages">Messages</Link></p>
        </div>
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Orders and prices</h2>
          <p className="mb-0 small">Your products, prices and orders are in the AddisB2B business desk. This workspace covers consumer complaints and your messages with consumers.</p></div>
      </div>
    </>
  );
}

import Link from "next/link";
import { Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { BUSINESS } from "@/features/business/menu";

export const metadata = { title: "Overview" };

// Prototype: merchant/overview.html. Only the complaint side belongs to this module; orders and prices are the
// existing AddisB2B desk (open question 12).
export default function BusinessOverviewPage() {
  return (
    <>
      <div className="ws-title"><div><h1>Good morning, {BUSINESS.first}<Am text="እንኳን ደህና መጡ" /></h1><p>Monday 2 November 2026 · {BUSINESS.name}</p></div></div>
      <div className="stack">
        <Alert tone="warn" icon="folder" title="A consumer complaint needs your reply">
          <p className="mb-0">CC-2026-00123 is waiting. Please reply by Wednesday 4 November, 09:40. <Link href="/business/complaints/CC-2026-00123">Open it</Link></p>
        </Alert>
        <div className="tiles">
          <div className="tile tile--alert"><b>1</b><span>Complaint needs your reply</span></div>
          <div className="tile"><b>1</b><span>Complaint with an officer</span></div>
          <div className="tile"><b>1</b><span>Resolved this month</span></div>
          <div className="tile"><b>2 days</b><span>Usual time to reply</span></div>
        </div>
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Orders and prices</h2>
          <p className="mb-0 small">Your products, prices and orders are in the AddisB2B business desk. This workspace covers consumer complaints and your messages with consumers and offices.</p></div>
      </div>
    </>
  );
}

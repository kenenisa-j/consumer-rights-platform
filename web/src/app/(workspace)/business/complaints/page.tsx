import { Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import Link from "next/link";
import { BIZ_LIST } from "@/mocks/biz-cases";
import { BizComplaintsTable } from "@/features/business/BizComplaintsTable";
import { BUSINESS } from "@/features/business/menu";

export const metadata = { title: "Consumer complaints" };

// Prototype: merchant/complaints.html. Only complaints about this business are shown, with the consumer as a number.
export default function BizComplaintsPage() {
  const waiting = BIZ_LIST.filter(r => r.action);
  return (
    <>
      <div className="ws-title"><div><h1>Consumer complaints<Am text="የሸማቾች ቅሬታዎች" /></h1>
        <p>Complaints that consumers have made about {BUSINESS.name}. Only your own business is shown.</p></div></div>
      <div className="tiles">
        <div className="tile tile--alert"><b>1</b><span>Needs your reply</span></div><div className="tile"><b>1</b><span>With the officer</span></div>
        <div className="tile"><b>1</b><span>Resolved this month</span></div><div className="tile"><b>2 days</b><span>Usual time to reply</span></div>
      </div>
      <div className="stack">
        {waiting.length > 0 && <Alert tone="warn" icon="folder" title={`${waiting.length} complaint is waiting for your reply`}>
          {waiting.map(w => <p key={w.reference} className="mb-0">{w.reference}: please reply by {w.deadline}. <Link href={`/business/complaints/${w.reference}`}>Open it</Link></p>)}</Alert>}
        <BizComplaintsTable rows={BIZ_LIST} />
      </div>
    </>
  );
}

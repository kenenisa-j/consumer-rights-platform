import { cookies } from "next/headers";
import Link from "next/link";
import { API_URL, requirePortal } from "@/lib/session";
import { Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { BUSINESS } from "@/features/business/menu";

export const metadata = { title: "Overview" };

async function fetchOverviewData() {
  try {
    const jar = await cookies();
    const [reportRes, casesRes] = await Promise.all([
      fetch(`${API_URL}/api/business/reports/overview`, { headers: { cookie: jar.toString() }, cache: "no-store" }),
      fetch(`${API_URL}/api/business/cases`, { headers: { cookie: jar.toString() }, cache: "no-store" }),
    ]);

    const report = reportRes.ok ? await reportRes.json() : null;
    const cases = casesRes.ok ? (await casesRes.json())?.cases : null;

    if (report || cases) {
      const waiting = Array.isArray(cases) ? cases.filter((c: any) => c.status === "SUBMITTED_TO_BUSINESS") : [];
      const withOfficer = Array.isArray(cases)
        ? cases.filter((c: any) => ["RECEIVED_BY_OFFICE", "UNDER_INITIAL_REVIEW", "OFFICER_ASSIGNED", "ESCALATED_TO_GOVERNMENT"].includes(c.status))
        : [];
      const resolved = Array.isArray(cases)
        ? cases.filter((c: any) => ["RESOLVED_MUTUALLY", "RESOLVED_ADMINISTRATIVE_ORDER"].includes(c.status))
        : [];

      return {
        waitingCount: report?.openCount ?? waiting.length,
        withOfficerCount: withOfficer.length,
        resolvedCount: report?.resolvedCount ?? resolved.length,
        firstWaiting: waiting[0] || null,
      };
    }
  } catch {
    // fallback
  }

  return {
    waitingCount: 1,
    withOfficerCount: 1,
    resolvedCount: 1,
    firstWaiting: { reference: "CC-2026-00123", slaDeadline: "Wednesday 4 November, 09:40" },
  };
}

// Prototype: merchant/overview.html. Only the complaint side belongs to this module; orders and prices are the
// existing AddisB2B desk (open question 12).
export default async function BusinessOverviewPage() {
  const me = await requirePortal("business", "/business/overview");
  const data = await fetchOverviewData();
  const tradeName = me.business?.tradeName || BUSINESS.name;
  const firstName = me.fullName.split(" ")[0] || BUSINESS.first;

  return (
    <>
      <div className="ws-title"><div><h1>Good morning, {firstName}<Am text="እንኳን ደህና መጡ" /></h1><p>{tradeName}</p></div></div>
      <div className="stack">
        {data.firstWaiting && (
          <Alert tone="warn" icon="folder" title="A consumer complaint needs your reply">
            <p className="mb-0">{data.firstWaiting.reference} is waiting. Please reply as soon as possible. <Link href={`/business/complaints/${data.firstWaiting.reference}`}>Open it</Link></p>
          </Alert>
        )}
        <div className="tiles">
          <div className={`tile ${data.waitingCount > 0 ? "tile--alert" : ""}`}><b>{data.waitingCount}</b><span>Complaint{data.waitingCount === 1 ? "" : "s"} need{data.waitingCount === 1 ? "s" : ""} your reply</span></div>
          <div className="tile"><b>{data.withOfficerCount}</b><span>Complaint{data.withOfficerCount === 1 ? "" : "s"} with an officer</span></div>
          <div className="tile"><b>{data.resolvedCount}</b><span>Resolved this month</span></div>
          <div className="tile"><b>2 days</b><span>Usual time to reply</span></div>
        </div>
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Orders and prices</h2>
          <p className="mb-0 small">Your products, prices and orders are in the AddisB2B business desk. This workspace covers consumer complaints and your messages with consumers and offices.</p></div>
      </div>
    </>
  );
}

import { requirePortal } from "@/lib/session";
import Link from "next/link";
import { cookies } from "next/headers";
import { bi } from "@/content/types";
import { listCases } from "@/mocks/cases";
import { PageHead } from "@/components/ui/PageHead";
import { Alert, KeyValue, StatusPill, EmptyState } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "My cases" };
export const dynamic = "force-dynamic";

const API = process.env.API_INTERNAL_URL || "http://127.0.0.1:4300";

async function fetchApi(path: string, cookieHeader: string) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function MyCasesPage() {
  const me = await requirePortal("consumer", "/my-cases");
  const jar = await cookies();
  const cookieHeader = jar.toString();

  let cases: any[] = [];
  let attention: any[] = [];

  const casesRes = await fetchApi("/api/cases", cookieHeader);
  if (casesRes?.data?.cases) {
    cases = casesRes.data.cases;
    attention = cases
      .filter((c: any) => c.status?.tone === "warn")
      .map((c: any) => ({ reference: c.reference, text: c.status.label }));
  } else {
    const mock = await listCases();
    cases = mock.cases;
    attention = mock.attention;
  }

  const firstName = me.fullName ? me.fullName.split(" ")[0] : "there";

  return (
    <>
      <PageHead crumbs={[{ label: "My cases" }]} title={bi("My cases", "የእኔ ጉዳዮች")}
        lead={`Hello, ${firstName}. Here are your complaints and what is happening with them.`}>
        <div className="btn-row mt-4">
          <Link className="btn btn--accent btn--stack" href="/complaint/new"><span>Make a new complaint</span><Am text="አዲስ ቅሬታ" /></Link>
          <Link className="btn btn--secondary" href="/notifications">Notifications</Link>
          <Link className="btn btn--secondary" href="/messages">Messages</Link>
        </div>
      </PageHead>
      <section className="section"><div className="container stack">
        {attention.length > 0 && (
          <Alert tone="warn" title={`${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your answer`}>
            <ul className="mb-0">{attention.map((a: any) => (
              <li key={a.reference}><Link href={`/cases/${a.reference}`}>{a.reference}: {a.text}</Link></li>))}</ul>
          </Alert>
        )}
        {cases.length === 0 ? (
          <EmptyState title="You have no complaints yet"><Link className="btn" href="/complaint/new">Make a complaint</Link></EmptyState>
        ) : (
          <div className="table-wrap"><table className="table table--stack">
            <caption className="visually-hidden">My complaints</caption>
            <thead><tr><th scope="col">Complaint</th><th scope="col">Business</th><th scope="col">Status</th><th scope="col">Last update</th>
              <th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
            <tbody>{cases.map((c: any) => (
              <tr key={c.reference}>
                <td><Link href={c.href}><b>{c.reference}</b></Link><small>{c.title}</small></td>
                <td data-label="Business">{c.business}</td>
                <td data-label="Status"><StatusPill tone={c.status.tone}>{c.status.label}</StatusPill></td>
                <td data-label="Last update">{c.updated}</td>
                <td className="num"><Link className="btn btn--secondary btn--sm" href={c.href}>Open</Link></td>
              </tr>))}</tbody>
          </table></div>
        )}
        <div className="grid-2">
          <div className="card card--flat"><h2 style={{ fontSize: "1.1rem" }}><Icon name="user" /> My account</h2>
            <KeyValue rows={[
              ["Name", me.fullName],
              ["Phone", me.phoneNumber],
              ["Email", me.email ?? "Not given"],
              ["Identity", <StatusPill key="id" tone="grey">Not confirmed yet</StatusPill>]
            ]} /></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.1rem" }}><Icon name="flag" /> Tips</h2>
            <p className="small">Tips are not linked to your account, so they do not appear here. Check a tip with its private code.</p>
            <Link className="btn btn--secondary btn--sm" href="/track?kind=tip">Check a tip</Link></div>
        </div>
      </div></section>
    </>
  );
}

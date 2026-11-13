import Link from "next/link";
import { bi } from "@/content/types";
import { listCases, ME } from "@/mocks/cases";
import { PageHead } from "@/components/ui/PageHead";
import { Alert, KeyValue, StatusPill, EmptyState } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "My cases" };

// Prototype: public/my-cases.html. Needs-your-answer list first, then every complaint, then the account.
export default async function MyCasesPage() {
  const { cases, attention } = await listCases();
  return (
    <>
      <PageHead crumbs={[{ label: "My cases" }]} title={bi("My cases", "የእኔ ጉዳዮች")}
        lead={`Hello, ${ME.first}. Here are your complaints and what is happening with them.`}>
        <div className="btn-row mt-4">
          <Link className="btn btn--accent btn--stack" href="/complaint/new"><span>Make a new complaint</span><Am text="አዲስ ቅሬታ" /></Link>
          <Link className="btn btn--secondary" href="/notifications">Notifications</Link>
          <Link className="btn btn--secondary" href="/messages">Messages</Link>
        </div>
      </PageHead>
      <section className="section"><div className="container stack">
        {attention.length > 0 && (
          <Alert tone="warn" title={`${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your answer`}>
            <ul className="mb-0">{attention.map(a => (
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
            <tbody>{cases.map(c => (
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
            <KeyValue rows={[["Name", ME.name], ["Phone", ME.phone], ["Email", ME.email], ["Lives in", ME.lives],
              ["Identity", <StatusPill key="id" tone="ok">{ME.identity}</StatusPill>]]} /></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.1rem" }}><Icon name="flag" /> Tips</h2>
            <p className="small">Tips are not linked to your account, so they do not appear here. Check a tip with its private code.</p>
            <Link className="btn btn--secondary btn--sm" href="/track?kind=tip">Check a tip</Link></div>
        </div>
      </div></section>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { serverGet } from "@/lib/server-api";
import { niceDate, statusOf } from "@/lib/case-status";
import { wantText } from "@/lib/case-data";
import { Alert, KeyValue, StatusPill, Timeline } from "@/components/ui/Display";
import { formatSize } from "@/lib/format";

type Props = { params: Promise<{ reference: string }> };

interface BizCaseDetail {
  reference: string; title: string; status: string; consumer: string; category: { nameEn: string }; narrative: string; item: string;
  boughtOn: string; amount: number; want: string; dueBy: string | null; evidence: { id: string; name: string; size: number }[]; history: { status: string; note: string | null; at: string }[];
}

export async function generateMetadata({ params }: Props) {
  return { title: `Complaint ${(await params).reference}` };
}

// The LIMITED view: the consumer is only a number. Read from the database; replying and offers are the next build step.
export default async function BizCasePage({ params }: Props) {
  const { reference } = await params;
  if (!REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const c = await serverGet<BizCaseDetail>(`/business/cases/${reference}`);
  if (!c) notFound();
  const st = statusOf(c.status);
  return (
    <>
      <div className="ws-title">
        <div><span className="kicker">Complaint</span><h1>{c.reference}</h1><p>{c.title}</p></div>
        <div className="btn-row"><Link className="btn btn--accent" href={`/business/messages?case=${c.reference}`}>Reply to the consumer</Link><Link className="btn btn--secondary" href="/business/complaints">Back to complaints</Link></div>
      </div>
      <p><StatusPill tone={st.tone}>{st.label}</StatusPill> <span className="small muted">Official status: {st.official}</span></p>
      <div className="layout">
        <div className="stack">
          <div className="card"><h2>What the consumer says</h2>
            <KeyValue rows={[["Consumer", c.consumer], ["Problem", c.category.nameEn], ["Item", c.item], ["Bought", niceDate(c.boughtOn)],
              ["Paid", `${c.amount.toLocaleString("en")} ETB`], ["The consumer asks for", wantText(c.want)]]} />
            <h3 className="mt-4">What happened</h3><p className="mb-0">{c.narrative}</p></div>
          <div className="card"><h2>Files the consumer shared ({c.evidence.length})</h2>
            {c.evidence.length === 0 ? <p className="muted mb-0">No files were shared with the business.</p> : (
              <ul className="picked">{c.evidence.map(e => <li className="picked__row" key={e.id}><span className="picked__main"><b><a href={`/api/evidence/${e.id}`} target="_blank" rel="noopener">{e.name}</a></b><small>{formatSize(e.size)}</small></span></li>)}</ul>)}
          </div>
          <div className="card"><h2>History</h2>
            <Timeline items={c.history.map((h, i) => ({ title: statusOf(h.status).label, when: niceDate(h.at, true), iso: h.at, text: h.note ?? undefined, state: i === 0 ? "now" as const : "done" as const }))} /></div>
        </div>
        <aside className="side">
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Your deadline</h2><p className="mb-0">{c.dueBy ? niceDate(c.dueBy) : "None set"}</p></div>
          <Alert tone="info" icon="bell" title="Offers are coming">You can answer the consumer in Messages, in writing or with a voice message. Making a settlement offer here is added in the next step.</Alert>
        </aside>
      </div>
    </>
  );
}

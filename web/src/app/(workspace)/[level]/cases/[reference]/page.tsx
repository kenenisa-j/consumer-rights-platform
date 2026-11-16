import Link from "next/link";
import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { serverGet } from "@/lib/server-api";
import { niceDate, statusOf } from "@/lib/case-status";
import { wantText } from "@/lib/case-data";
import { Alert, KeyValue, StatusPill, Timeline } from "@/components/ui/Display";
import { formatSize } from "@/lib/format";
import { isGovLevel } from "@/features/gov/levels";
import { RedirectCase } from "@/features/gov/RedirectCase";

type Props = { params: Promise<{ level: string; reference: string }> };

interface OfficeCaseDetail {
  reference: string; title: string; status: string; urgent: boolean; category: { nameEn: string }; business: string; registeredBusiness: boolean;
  handledBy: { name: string } | null; createdAt: string; updatedAt: string; complainant: string; alias: string; phone: string;
  narrative: string; item: string; boughtOn: string; amount: number; want: string; receipt: boolean; dueBy: string | null;
  history: { status: string; note: string | null; at: string }[];
  evidence: { id: string; name: string; type: string; size: number; shared: boolean }[];
}

export async function generateMetadata({ params }: Props) {
  return { title: `Case ${(await params).reference}` };
}

// One workspace for every case this office holds. Read from the database; the officer's actions (accept, assign, pass up) are the next build step.
export default async function GovCasePage({ params }: Props) {
  const { level, reference } = await params;
  if (!isGovLevel(level) || !REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const c = await serverGet<OfficeCaseDetail>(`/office/cases/${reference}`);
  if (!c) notFound();
  const st = statusOf(c.status);
  return (
    <>
      <div className="ws-title">
        <div><span className="kicker">Complaint</span><h1>{c.reference}</h1><p>{c.title}</p></div>
        <div className="btn-row"><Link className="btn btn--accent" href={`/${level}/messages?case=${c.reference}`}>Message the consumer</Link>{st.stage !== "resolved" && <RedirectCase reference={c.reference} level={level} />}<Link className="btn btn--secondary" href={`/${level}/cases`}>Back to cases</Link></div>
      </div>
      <p><StatusPill tone={st.tone}>{st.label}</StatusPill> {c.urgent && <span className="urgent">Health or safety risk</span>}
        <span className="small muted"> Official status: {st.official}</span></p>
      <div className="layout">
        <div className="stack">
          <div className="card"><h2>The complaint</h2>
            <KeyValue rows={[["Problem", c.category.nameEn], ["Business", `${c.business}${c.registeredBusiness ? " (on AddisB2B)" : " (not on AddisB2B)"}`],
              ["Bought", `${c.item}, on ${niceDate(c.boughtOn)}`], ["Amount", `${c.amount.toLocaleString("en")} ETB`], ["Receipt", c.receipt ? "Yes" : "No"],
              ["Asks for", wantText(c.want)]]} />
            <h3 className="mt-4">What happened</h3><p className="mb-0">{c.narrative}</p>
          </div>
          <div className="card"><h2>Evidence ({c.evidence.length})</h2>
            {c.evidence.length === 0 ? <p className="muted mb-0">The consumer has not added any files.</p> : (
              <ul className="picked">{c.evidence.map(e => <li className="picked__row" key={e.id}><span className="picked__main"><b><a href={`/api/evidence/${e.id}`} target="_blank" rel="noopener">{e.name}</a></b><small>{formatSize(e.size)} · {e.shared ? "The business may see it" : "Officers only"}</small></span></li>)}</ul>)}
          </div>
          <div className="card"><h2>History</h2>
            <Timeline items={c.history.map((h, i) => ({ title: statusOf(h.status).label, when: niceDate(h.at, true), iso: h.at, text: h.note ?? undefined, state: i === 0 ? "now" as const : "done" as const }))} />
          </div>
        </div>
        <aside className="side">
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>The consumer</h2>
            <KeyValue single rows={[["Name", c.complainant], ["Phone", c.phone], ["Shown to the business as", c.alias]]} />
            <p className="small muted mt-4 mb-0">Only officers see these details. The business sees &ldquo;{c.alias}&rdquo;.</p></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Held by</h2>
            <KeyValue single rows={[["Office", c.handledBy?.name ?? "—"], ["Received", niceDate(c.createdAt, true)], ["Answer due", c.dueBy ? niceDate(c.dueBy) : "—"]]} /></div>
          <Alert tone="info" icon="bell" title="More actions are coming">You can send the case to another office and write to the consumer. Accepting, assigning an officer and meetings are added in the next step.</Alert>
        </aside>
      </div>
    </>
  );
}

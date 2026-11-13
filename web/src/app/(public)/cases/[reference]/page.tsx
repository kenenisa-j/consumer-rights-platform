import Link from "next/link";
import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { freeCallNumber } from "@/lib/config";
import { getCase } from "@/mocks/cases";
import { CASE_123_STEPS } from "@/mocks/case-123";
import { CaseView } from "@/features/cases/CaseView";

type Props = { params: Promise<{ reference: string }>; searchParams: Promise<{ step?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Case ${(await params).reference}` };
}

// Prototype: public/case-00123*.html, case-00140-*.html, case-00118-outside.html. One screen for every state:
// the page renders from the case's status, and the available actions come from `pending`.
export default async function CasePage({ params, searchParams }: Props) {
  const { reference } = await params;
  const { step } = await searchParams;
  if (!REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const data = await getCase(reference, step);
  if (!data) notFound();
  return (
    <>
      <div className="container" style={{ paddingTop: "var(--s4)" }}>
        <nav aria-label="You are here"><ol className="crumbs">
          <li><Link href="/">Home</Link></li><li><Link href="/my-cases">My cases</Link></li><li aria-current="page">{reference}</li>
        </ol></nav>
      </div>
      {/* key: switching the demo step remounts the view with that snapshot */}
      <CaseView key={`${reference}-${step ?? ""}`} initial={data} freeCall={freeCallNumber()} />
      {reference === "CC-2026-00123" && (
        <section className="section section--tight"><div className="container">
          <div className="card card--flat"><h2 style={{ fontSize: "1rem" }}>Demo: see this case at another point of its climb</h2>
            <p className="small muted">Sample data only. The real page shows the one current state of your case.</p>
            <div className="btn-row">{CASE_123_STEPS.map(s => (
              <Link key={s} className={`btn btn--sm ${s === (step ?? "offer") ? "" : "btn--secondary"}`.trim()}
                href={`/cases/${reference}?step=${s}`} scroll={false}>{s}</Link>))}</div></div>
        </div></section>
      )}
    </>
  );
}

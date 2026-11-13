import Link from "next/link";
import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { freeCallNumber } from "@/lib/config";
import { BIZ_STEPS, getBizCase } from "@/mocks/biz-cases";
import { BizCaseView } from "@/features/business/BizCaseView";

type Props = { params: Promise<{ reference: string }>; searchParams: Promise<{ step?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Complaint ${(await params).reference}` };
}

// Prototype: merchant/complaint-00123*.html (8 files). One page: what the business can do comes from the case state.
export default async function BizCasePage({ params, searchParams }: Props) {
  const { reference } = await params;
  const { step } = await searchParams;
  if (!REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const data = await getBizCase(reference, step);
  if (!data) notFound();
  return (
    <>
      <BizCaseView key={`${reference}-${step ?? ""}`} initial={data} freeCall={freeCallNumber()} />
      <div className="card card--flat mt-5"><h2 style={{ fontSize: "1rem" }}>Demo: see this complaint at another point</h2>
        <p className="small muted">Sample data only. The real page shows the one current state.</p>
        <div className="btn-row">{BIZ_STEPS.map(s => (
          <Link key={s} className={`btn btn--sm ${s === (step ?? "reply") ? "" : "btn--secondary"}`.trim()} href={`/business/complaints/${reference}?step=${s}`} scroll={false}>{s}</Link>))}</div></div>
    </>
  );
}

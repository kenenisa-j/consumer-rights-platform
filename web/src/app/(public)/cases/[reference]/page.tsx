import { requirePortal } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { freeCallNumber } from "@/lib/config";
import { serverGet } from "@/lib/server-api";
import { toCaseData, type ApiCase } from "@/lib/case-data";
import { Alert } from "@/components/ui/Display";
import { CaseView } from "@/features/cases/CaseView";
import { AddEvidence } from "@/features/cases/AddEvidence";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Case ${(await params).reference}` };
}

// One screen for every state: it draws from the case's status in the database. Only the person who made the complaint can open it.
export default async function CasePage({ params }: Props) {
  const { reference } = await params;
  await requirePortal("consumer", `/cases/${reference}`);
  if (!REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const found = await serverGet<ApiCase>(`/complaints/${reference}`);
  if (!found) notFound();
  return (
    <>
      <div className="container" style={{ paddingTop: "var(--s4)" }}>
        <nav aria-label="You are here"><ol className="crumbs">
          <li><Link href="/">Home</Link></li><li><Link href="/my-cases">My cases</Link></li><li aria-current="page">{reference}</li>
        </ol></nav>
      </div>
      <CaseView initial={toCaseData(found)} freeCall={freeCallNumber()} />
      <div className="container stack">
        {found.status.startsWith("CLOSED") || found.status.startsWith("RESOLVED") ? null : <AddEvidence reference={reference} existing={found.evidence.length} />}
        <Alert tone="info" icon="bell" title="Offers are coming">
        You can follow your case and write to the officer or the business in Messages. Settling an offer here is added in the next step of the build.</Alert></div>
    </>
  );
}

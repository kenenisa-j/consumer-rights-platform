import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { getGovCase } from "@/mocks/gov-cases";
import { GovCaseView } from "@/features/gov/GovCaseView";
import { isGovLevel } from "@/features/gov/levels";

type Props = { params: Promise<{ level: string; reference: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Case ${(await params).reference}` };
}

// Prototype: woreda|subcity|bureau/case-00123.html and woreda/case-00140.html. One workspace for every case;
// what the officer can do depends on the level and on where the case is.
export default async function GovCasePage({ params }: Props) {
  const { level, reference } = await params;
  if (!isGovLevel(level) || !REFERENCE_PATTERNS.complaint.test(reference)) notFound();
  const data = await getGovCase(level, reference);
  if (!data) notFound();
  return <GovCaseView key={`${level}-${reference}`} initial={data} level={level} />;
}

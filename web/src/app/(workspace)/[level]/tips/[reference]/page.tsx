import { notFound } from "next/navigation";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { getTip } from "@/mocks/gov-tips";
import { TipView } from "@/features/gov/TipView";
import { isGovLevel } from "@/features/gov/levels";

type Props = { params: Promise<{ level: string; reference: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Tip ${(await params).reference}` };
}

// Prototype: woreda|subcity|bureau/tip-00045.html
export default async function TipPage({ params }: Props) {
  const { level, reference } = await params;
  if (!isGovLevel(level) || !REFERENCE_PATTERNS.tip.test(reference)) notFound();
  const tip = await getTip(level, reference);
  if (!tip) notFound();
  return <TipView key={`${level}-${reference}`} initial={tip} level={level} />;
}

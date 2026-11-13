import { notFound } from "next/navigation";
import { freeCallNumber } from "@/lib/config";
import { IntakeForm } from "@/features/gov/IntakeForm";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "New complaint" };

// Prototype: woreda|subcity|bureau/intake.html and intake-saved.html. The success screen replaces the form in place.
export default async function IntakePage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <IntakeForm level={level} freeCall={freeCallNumber()} />;
}

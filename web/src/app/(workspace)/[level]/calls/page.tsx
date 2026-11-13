import { notFound } from "next/navigation";
import { freeCallNumber } from "@/lib/config";
import { CallsView } from "@/features/gov/CallsView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Free call line" };

// Prototype: woreda|subcity|bureau/calls.html
export default async function CallsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <CallsView level={level} freeCall={freeCallNumber()} />;
}

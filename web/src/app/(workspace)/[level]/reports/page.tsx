import { notFound } from "next/navigation";
import { ReportsView } from "@/features/gov/ReportsView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Reports" };

// Prototype: woreda|subcity|bureau/reports.html. Scoped to the level: market, Woreda or the whole city.
export default async function ReportsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <ReportsView level={level} />;
}

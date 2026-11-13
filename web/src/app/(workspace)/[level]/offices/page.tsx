import { notFound } from "next/navigation";
import { OfficesView } from "@/features/gov/OfficesView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Offices" };

// Prototype: woreda|subcity|bureau/offices.html. One page, scoped to the level in the address.
export default async function OfficesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <OfficesView level={level} />;
}

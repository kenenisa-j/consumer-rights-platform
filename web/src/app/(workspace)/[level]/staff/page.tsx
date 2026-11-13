import { notFound } from "next/navigation";
import { StaffView } from "@/features/gov/StaffView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Staff and roles" };

// Prototype: woreda|subcity|bureau/staff.html. One page, scoped to the level in the address.
export default async function StaffPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <StaffView level={level} />;
}

import { notFound } from "next/navigation";
import { SettingsView } from "@/features/gov/SettingsView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Settings" };

// Prototype: woreda|subcity|bureau/settings.html. One page, scoped to the level in the address.
export default async function SettingsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <SettingsView level={level} />;
}

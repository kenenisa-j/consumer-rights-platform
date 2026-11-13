import { notFound } from "next/navigation";
import { ContentView } from "@/features/gov/ContentView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Public content" };

// Prototype: woreda|subcity|bureau/content.html. One page, scoped to the level in the address.
export default async function ContentPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <ContentView level={level} />;
}

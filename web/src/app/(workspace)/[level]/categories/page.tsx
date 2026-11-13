import { notFound } from "next/navigation";
import { CategoriesView } from "@/features/gov/CategoriesView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Categories" };

// Prototype: woreda|subcity|bureau/categories.html. One page, scoped to the level in the address.
export default async function CategoriesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return <CategoriesView level={level} />;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Display";
import { GOV_LEVELS, GOV_MENU, LEVELS, isGovLevel } from "@/features/gov/levels";

type Params = { level: string; section: string };
const SECTIONS = GOV_MENU.flatMap(g => g.items).filter(i => !["dashboard", "cases"].includes(i.slug));

export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  return GOV_LEVELS.flatMap(level => SECTIONS.map(s => ({ level, section: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  return { title: SECTIONS.find(s => s.slug === section)?.label ?? "Page" };
}

// The rest of the government menu (prototype: intake, calls, tips, messages, reports, staff, offices, categories,
// content, settings). Each is built in the next slice, so the menu never leads to a 404.
export default async function SectionPage({ params }: { params: Promise<Params> }) {
  const { level, section } = await params;
  const item = SECTIONS.find(s => s.slug === section);
  if (!isGovLevel(level) || !item) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>{item.label}</h1><p>{LEVELS[level].office}</p></div></div>
      <Alert icon="clock" title="This page is not built yet">
        <p>It is part of the next slice of the {LEVELS[level].levelName} portal. The dashboard and the cases, including opening a case and acting on it, are ready.</p>
        <p className="mb-0"><Link href={`/${level}/dashboard`}>Back to the dashboard</Link> · <Link href={`/${level}/cases`}>Open the cases</Link></p>
      </Alert>
    </>
  );
}

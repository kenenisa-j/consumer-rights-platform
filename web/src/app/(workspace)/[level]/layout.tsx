import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { freeCallNumber } from "@/lib/config";
import { initialsOf, requirePortal } from "@/lib/session";
import { GOV_LEVELS, GOV_MENU, LEVELS, isGovLevel } from "@/features/gov/levels";

// One layout for the three government portals: /woreda, /subcity, /bureau. Anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() { return GOV_LEVELS.map(level => ({ level })); }

export default async function GovLayout({ children, params }: { children: ReactNode; params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const me = await requirePortal(level, `/${level}/dashboard`);
  const cfg = LEVELS[level];
  const groups = GOV_MENU.map(g => ({
    title: g.title,
    items: g.items.map(i => ({ href: `/${level}/${i.slug}`, label: i.label, icon: i.icon, count: i.count ? cfg.counts[i.count] : undefined }))
  }));
  return (
    <WorkspaceShell portal={cfg.portal} homeHref={`/${level}/dashboard`} groups={groups} who={{ name: me.fullName, role: me.office?.nameEn ?? cfg.person.role, initials: initialsOf(me.fullName) }} freeCall={freeCallNumber()}>
      {children}
    </WorkspaceShell>
  );
}

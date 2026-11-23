import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { freeCallNumber } from "@/lib/config";
import { initialsOf, requirePortal } from "@/lib/session";
import { serverGet } from "@/lib/server-api";
import { getOfficeCases, needsAction } from "@/lib/gov-data";
import { GOV_LEVELS, GOV_MENU, LEVELS, isGovLevel } from "@/features/gov/levels";

// One layout for the three government portals: /woreda, /subcity, /bureau. Anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() { return GOV_LEVELS.map(level => ({ level })); }

export default async function GovLayout({ children, params }: { children: ReactNode; params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const me = await requirePortal(level, `/${level}/dashboard`);
  const cfg = LEVELS[level];
  // The numbers on the menu come from the database: cases waiting for the office, new tips, unread messages.
  const [office, tips, unread, notes] = await Promise.all([
    getOfficeCases(), serverGet<{ status: string }[]>("/office/tips"), serverGet<{ total: number }>("/messages/unread"), serverGet<{ unreadCount: number }>("/notifications/unread-count")
  ]);
  const counts: Record<string, number | undefined> = {
    cases: office ? office.cases.filter(needsAction).length : undefined,
    tips: tips ? tips.filter(t => t.status === "received").length : undefined,
    messages: unread?.total
  };
  const groups = GOV_MENU.map(g => ({
    title: g.title,
    items: g.items.map(i => ({ href: `/${level}/${i.slug}`, label: i.label, icon: i.icon, count: counts[i.slug] || undefined }))
  }));
  return (
    <WorkspaceShell portal={cfg.portal} homeHref={`/${level}/dashboard`} groups={groups} who={{ name: me.fullName, role: me.office?.nameEn ?? cfg.person.role, initials: initialsOf(me.fullName) }} freeCall={freeCallNumber()} bell={{ href: `/${level}/notifications`, unread: notes?.unreadCount ?? 0 }} menu={[{ href: `/${level}/messages`, label: "Messages" }]}>
      {children}
    </WorkspaceShell>
  );
}

import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { freeCallNumber } from "@/lib/config";
import { initialsOf, requirePortal } from "@/lib/session";
import { BIZ_MENU, BUSINESS } from "@/features/business/menu";

export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const me = await requirePortal("business", "/business/overview");
  const groups = BIZ_MENU.map(g => ({ title: g.title, items: g.items.map(i => ({ href: `/business/${i.slug}`, label: i.label, icon: i.icon, count: i.count })) }));
  return (
    <WorkspaceShell portal={BUSINESS.portal} homeHref="/business/overview" groups={groups} freeCall={freeCallNumber()}
      who={{ name: me.business?.tradeName ?? BUSINESS.name, role: me.fullName, initials: initialsOf(me.business?.tradeName ?? me.fullName) }}>
      {children}
    </WorkspaceShell>
  );
}

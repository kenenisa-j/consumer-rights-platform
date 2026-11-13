import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { freeCallNumber } from "@/lib/config";
import { BIZ_MENU, BUSINESS } from "@/features/business/menu";

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const groups = BIZ_MENU.map(g => ({ title: g.title, items: g.items.map(i => ({ href: `/business/${i.slug}`, label: i.label, icon: i.icon, count: i.count })) }));
  return (
    <WorkspaceShell portal={BUSINESS.portal} homeHref="/business/overview" groups={groups} freeCall={freeCallNumber()}
      who={{ name: BUSINESS.name, role: BUSINESS.place, initials: BUSINESS.initials }}>
      {children}
    </WorkspaceShell>
  );
}

import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { freeCallNumber } from "@/lib/config";
import { initialsOf, requirePortal } from "@/lib/session";
import { serverGet } from "@/lib/server-api";
import { BIZ_MENU, BUSINESS } from "@/features/business/menu";

const REPLY = new Set(["SUBMITTED_TO_BUSINESS", "BUSINESS_OFFER_PENDING"]);

export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const me = await requirePortal("business", "/business/overview");
  // The number on "Consumer complaints" is the complaints that wait for this business's reply, from the database.
  const cases = await serverGet<{ status: string }[]>("/business/complaints");
  const waiting = (cases ?? []).filter(c => REPLY.has(c.status)).length;
  const groups = BIZ_MENU.map(g => ({
    title: g.title,
    items: g.items.map(i => ({ href: `/business/${i.slug}`, label: i.label, icon: i.icon, count: i.slug === "complaints" ? waiting : undefined }))
  }));
  const name = me.business?.tradeName ?? BUSINESS.name;
  return (
    <WorkspaceShell portal={BUSINESS.portal} homeHref="/business/overview" groups={groups} freeCall={freeCallNumber()}
      menu={[{ href: "/business/profile", label: "Business profile" }, { href: "/business/complaints", label: "Consumer complaints" }, { href: "/business/messages", label: "Messages" }]}
      who={{ name, role: me.fullName, initials: initialsOf(name) }}>
      {children}
    </WorkspaceShell>
  );
}

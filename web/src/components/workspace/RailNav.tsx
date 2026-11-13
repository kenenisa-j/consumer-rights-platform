"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

export interface RailItem { href: string; label: string; icon: IconName; count?: number }
export interface RailGroup { title: string; items: RailItem[] }

/** The side menu. Marks the current page and closes the phone drawer after a page change. */
export function RailNav({ groups }: { groups: RailGroup[] }) {
  const pathname = usePathname();
  useEffect(() => {
    const toggle = document.getElementById("rail-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  }, [pathname]);

  return (
    <nav aria-label="Workspace menu">
      {groups.map(g => (
        <div key={g.title}>
          <h2>{g.title}</h2>
          {g.items.map(i => {
            const current = pathname === i.href || pathname.startsWith(`${i.href}/`);
            return (
              <Link key={i.href} href={i.href} aria-current={current ? "page" : undefined}>
                <Icon name={i.icon} /><span>{i.label}</span>
                {i.count ? <span className="count">{i.count}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

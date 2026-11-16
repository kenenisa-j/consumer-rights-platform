"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavEntry } from "@/content/shell";

const isGroup = (e: NavEntry): e is Extract<NavEntry, { items: unknown }> => "items" in e;

/**
 * The menu row. Plain links, and groups with a small arrow that open a list while the pointer is over them or they have focus.
 * The current page is a filled pill (its group too when the page is inside it).
 */
export function MainNav() {
  const pathname = usePathname();
  const here = (href: string) => href.split("#")[0] === pathname;
  return (
    <nav className="hdr-nav" aria-label="Main">
      <ul>
        {NAV.map(e => isGroup(e) ? (
          <li key={e.label} className="hdr-item hdr-item--group">
            <button type="button" className={e.items.some(i => here(i.href)) ? "is-current" : undefined} aria-haspopup="true">{e.label}<i aria-hidden="true" className="hdr-caret" /></button>
            <ul className="hdr-menu">
              {e.items.map(i => <li key={i.href}><Link href={i.href} aria-current={here(i.href) ? "page" : undefined}>{i.label}</Link></li>)}
            </ul>
          </li>
        ) : (
          <li key={e.href} className="hdr-item">
            <Link href={e.href} aria-current={here(e.href) ? "page" : undefined}>{e.href === "/" && <svg viewBox="0 0 24 24" aria-hidden="true" className="hdr-home"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>}{e.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

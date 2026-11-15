"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/content/shell";
import { Am } from "@/components/ui/Bi";

/**
 * Four everyday links, then "More" for the reading pages, so the bar never runs out of room on a laptop screen.
 * On a phone the whole list opens flat from the Menu button (the `.nav-flat` items), and "More" is not shown.
 */
export function MainNav() {
  const pathname = usePathname();
  const here = (href: string) => (pathname === href ? "page" : undefined);
  const main = NAV.filter(i => !i.more);
  const more = NAV.filter(i => i.more);
  const moreActive = more.some(i => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return (
    <nav className="nav-bar" aria-label="Main">
      <ul>
        {main.map(item => (
          <li key={item.href} className={item.href === "/" ? "nav-home" : undefined}>
            <Link href={item.href} aria-current={here(item.href)}>{item.label.en}<Am text={item.label.am} /></Link>
          </li>
        ))}
        {more.map(item => (
          <li key={item.href} className="nav-flat">
            <Link href={item.href} aria-current={here(item.href)}>{item.label.en}<Am text={item.label.am} /></Link>
          </li>
        ))}
        <li className="nav-more">
          <details>
            <summary className={moreActive ? "is-current" : undefined}>More<Am text="ተጨማሪ" /></summary>
            <ul>
              {more.map(item => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={here(item.href)}>{item.label.en}<Am text={item.label.am} /></Link>
                </li>
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </nav>
  );
}

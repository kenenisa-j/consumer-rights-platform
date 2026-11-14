"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/content/shell";
import { Am } from "@/components/ui/Bi";

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="nav-bar" aria-label="Main">
      <ul>
          {NAV.map(item => (
            <li key={item.href}>
              <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label.en}<Am text={item.label.am} />
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}

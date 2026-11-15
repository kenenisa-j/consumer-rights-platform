import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { RailNav, type RailGroup } from "./RailNav";

interface Props {
  portal: string;                       // "Woreda portal"
  homeHref: string;
  groups: RailGroup[];
  who: { name: string; role: string; initials: string };
  freeCall: string;
  /** Links in the menu that opens from the name and picture at the top right. */
  menu?: { href: string; label: string }[];
  children: ReactNode;
}

/** Left rail, top bar and content area shared by the business desk and the three government portals. */
export function WorkspaceShell({ portal, homeHref, groups, who, freeCall, menu = [], children }: Props) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <input className="nav-toggle" type="checkbox" id="rail-toggle" aria-label="Open the menu" />
      <div className="ws-shell">
        <aside className="rail" aria-label="Main menu">
          <Link className="rail__brand" href={homeHref}>
            <span className="brand__mark" aria-hidden="true">H<i>.</i></span>
            <span><b>AddisB2B</b><small>{portal}</small></span>
          </Link>
          <RailNav groups={groups} />
          <div className="rail__foot">
            <a href={`tel:${freeCall}`}>Free call line {freeCall}</a>
            <SignOutButton className="rail__out">Sign out</SignOutButton>
          </div>
        </aside>
        <div className="ws-main">
          <header className="topbar">
            <label className="nav-burger" htmlFor="rail-toggle"><Icon name="menu" /> Menu</label>
            <div className="topbar__who"><b>{who.name}</b><small>{who.role}</small></div>
            <details className="ws-account">
              <summary aria-label={`Account menu for ${who.name}`}><span className="avatar" aria-hidden="true">{who.initials}</span></summary>
              <div className="ws-account__menu">
                <div className="ws-account__who"><b>{who.name}</b><small>{who.role}</small></div>
                <Link href={homeHref}>Home</Link>
                {menu.map(m => <Link key={m.href} href={m.href}>{m.label}</Link>)}
                <hr />
                <SignOutButton className="ws-account__out">Sign out</SignOutButton>
              </div>
            </details>
          </header>
          <main id="main" className="ws-content">{children}</main>
          <div className="ws-foot">AddisB2B · Addis Ababa City Administration Bureau of Trade</div>
        </div>
      </div>
    </>
  );
}

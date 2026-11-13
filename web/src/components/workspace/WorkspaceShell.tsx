import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { RailNav, type RailGroup } from "./RailNav";

interface Props {
  portal: string;                       // "Woreda portal"
  homeHref: string;
  groups: RailGroup[];
  who: { name: string; role: string; initials: string };
  freeCall: string;
  children: ReactNode;
}

/** Left rail, top bar and content area shared by the business desk and the three government portals. */
export function WorkspaceShell({ portal, homeHref, groups, who, freeCall, children }: Props) {
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
            <Link href="/sign-in">Sign out</Link>
          </div>
        </aside>
        <div className="ws-main">
          <header className="topbar">
            <label className="nav-burger" htmlFor="rail-toggle"><Icon name="menu" /> Menu</label>
            <div className="topbar__who"><b>{who.name}</b><small>{who.role}</small></div>
            <span className="avatar" role="img" aria-label={`Signed in as ${who.name}`}>{who.initials}</span>
          </header>
          <main id="main" className="ws-content">{children}</main>
          <div className="ws-foot">AddisB2B · Addis Ababa City Administration Bureau of Trade</div>
        </div>
      </div>
    </>
  );
}

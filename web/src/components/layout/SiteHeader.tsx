import Link from "next/link";
import { BRAND } from "@/content/shell";
import { Icon } from "@/components/ui/Icon";
import type { Me } from "@/lib/session";
import { MainNav } from "./MainNav";
import { AccountMenu } from "./AccountMenu";

export function SiteHeader({ freeCall, me }: { freeCall: string; me: Me | null }) {
  return (
    <header className="site-header">
      <input className="nav-toggle" type="checkbox" id="nav-toggle" aria-label="Open the menu" />
      <div className="container head-row">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">H<i>.</i></span>
          <span><b>{BRAND.name}</b><small>{BRAND.tagline}<span lang="am"> · {BRAND.taglineAm}</span></small></span>
        </Link>
        <MainNav />
        <div className="head-actions">
          <label className="nav-burger" htmlFor="nav-toggle"><Icon name="menu" /> <span className="nav-burger__text">Menu</span></label>
          <a className="call-pill" href="#call" title="Free call"><Icon name="phone" /><span className="call-pill__label">Free call</span> <b>{freeCall}</b></a>
          {me ? <AccountMenu me={me} /> : (
            <>
              <Link className="btn btn--secondary btn--sm" href="/register">Register</Link>
              <a className="btn btn--sm" href="#signin"><Icon name="user" /> Sign in</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

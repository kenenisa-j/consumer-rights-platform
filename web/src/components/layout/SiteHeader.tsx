import Link from "next/link";
import { BRAND } from "@/content/shell";
import { Icon } from "@/components/ui/Icon";
import { MainNav } from "./MainNav";

export function SiteHeader({ freeCall }: { freeCall: string }) {
  return (
    <header className="site-header">
      <input className="nav-toggle" type="checkbox" id="nav-toggle" aria-label="Open the menu" />
      <div className="container head-row">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">H<i>.</i></span>
          <span><b>{BRAND.name}</b><small>{BRAND.tagline}<span lang="am">{BRAND.taglineAm}</span></small></span>
        </Link>
        <div className="head-actions">
          <label className="nav-burger" htmlFor="nav-toggle"><Icon name="menu" /> <span className="nav-burger__text">Menu</span></label>
          <a className="call-pill" href="#call"><Icon name="phone" /><span>Free call <b>{freeCall}</b></span></a>
          <Link className="lang-link" href="/am" lang="am">አማርኛ</Link>
          <Link className="btn btn--secondary btn--sm" href="/register">Register</Link>
          <a className="btn btn--sm" href="#signin"><Icon name="user" /> Sign in</a>
        </div>
      </div>
      <MainNav />
    </header>
  );
}

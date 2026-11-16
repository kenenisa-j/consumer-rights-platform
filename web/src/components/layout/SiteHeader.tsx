import Link from "next/link";
import { BRAND } from "@/content/shell";
import { Icon } from "@/components/ui/Icon";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { Locale } from "@/lib/i18n";
import type { Me } from "@/lib/session";
import { MainNav } from "./MainNav";
import { AccountMenu } from "./AccountMenu";

/**
 * The top bar, in the style of the AddisB2B Trade Bureau site: the Bureau's logo and name, a search box, the language list, the free call
 * number and the account (or Sign in), then the menu row. The menu button shows the menu on a phone.
 */
export function SiteHeader({ freeCall, me, locale, unread = 0 }: { freeCall: string; me: Me | null; locale: Locale; unread?: number }) {
  return (
    <header className="site-header hdr">
      <input className="nav-toggle" type="checkbox" id="nav-toggle" aria-label="Open the menu" />
      <div className="hdr-top">
        <div className="container hdr-top__row">
          <Link className="hdr-brand" href="/" aria-label={`${BRAND.org} ${BRAND.name}, home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} width={56} height={56} alt="" />
            <span><small>{BRAND.org}</small><b>{BRAND.name}</b></span>
          </Link>
          <form className="hdr-search" action="/help" method="get" role="search">
            <Icon name="search" />
            <input type="search" name="q" placeholder="Search questions, laws and news…" aria-label="Search questions, laws and news" autoComplete="off" />
          </form>
          <div className="hdr-tools">
            <a className="call-pill" href={`tel:${freeCall}`} title="Free call"><Icon name="phone" /><b>{freeCall}</b></a>
            <LanguageSwitcher locale={locale} />
            {me && <Link className="hdr-bell" href="/notifications" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}><Icon name="bell" />{unread > 0 && <span className="hdr-bell__n">{unread > 99 ? "99+" : unread}</span>}</Link>}
            {me ? <AccountMenu me={me} /> : (
              <>
                <Link className="btn btn--secondary btn--sm hdr-register" href="/register">Register</Link>
                <a className="btn btn--sm hdr-signin" href="#signin"><Icon name="user" /> Sign in</a>
              </>
            )}
            <label className="hdr-burger" htmlFor="nav-toggle"><Icon name="menu" /><span className="visually-hidden">Menu</span></label>
          </div>
        </div>
      </div>
      <div className="hdr-navrow"><div className="container"><MainNav /></div></div>
    </header>
  );
}

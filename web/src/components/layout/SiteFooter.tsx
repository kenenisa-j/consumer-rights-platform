import Link from "next/link";
import { BRAND, FOOTER } from "@/content/shell";
import { FREE_CALL_HOURS } from "@/lib/config";
import { Icon } from "@/components/ui/Icon";

export function SiteFooter({ freeCall }: { freeCall: string }) {
  const { about, help, learn, contact, note } = FOOTER;
  return (
    <footer className="site-footer">
      <div className="foot-cta">
        <div className="container">
          <div>
            <h2>Not sure where to start?</h2>
            <p>Call free and an officer will help you write it down.</p>
          </div>
          <div className="btn-row">
            <a className="btn btn--accent btn--lg" href={`tel:${freeCall}`}><Icon name="phone" /> Call {freeCall}</a>
            <Link className="btn btn--secondary btn--lg" href="/complaint/new">Make a complaint</Link>
          </div>
        </div>
      </div>
      <div className="container foot-main">
        <div className="foot-grid">
          <div>
            <div className="foot-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logo} width={52} height={52} alt="" />
              <span><small>{BRAND.org}</small><b>{BRAND.name}</b></span>
            </div>
            <h2 className="foot-title">{about.title}</h2>
            <p>{about.text}</p>
            <p lang="am" className="mb-0">{about.am}</p>
            <Link className="foot-lang" href="/am" lang="am">አማርኛ</Link>
          </div>
          <nav aria-label={help.title}>
            <h2 className="foot-title">{help.title}</h2>
            <ul>{help.links.map(([href, text]) => <li key={href}><Link href={href}>{text}</Link></li>)}</ul>
          </nav>
          <nav aria-label={learn.title}>
            <h2 className="foot-title">{learn.title}</h2>
            <ul>{learn.links.map(([href, text]) => <li key={href}><Link href={href}>{text}</Link></li>)}</ul>
          </nav>
          <div>
            <h2 className="foot-title">{contact.title}</h2>
            <ul className="foot-contact">
              <li><Icon name="phone" /><span><a href={`tel:${freeCall}`}>Free call: {freeCall}</a><br />{FREE_CALL_HOURS.short}</span></li>
              <li><Icon name="pin" /><span>Your Woreda trade office<br /><Link href="/help#offices">Find an office</Link></span></li>
              <li><Icon name="building" /><span>For businesses<br /><Link href="/sign-in">Sign in to your desk</Link></span></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="foot-note"><span>{note[0]}</span><span>{note[1]}</span></div>
      </div>
    </footer>
  );
}

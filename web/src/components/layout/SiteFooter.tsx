import Link from "next/link";
import { FOOTER } from "@/content/shell";
import { FREE_CALL_HOURS } from "@/lib/config";

export function SiteFooter({ freeCall }: { freeCall: string }) {
  const { about, help, learn, contact, note } = FOOTER;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-grid">
          <div><h2>{about.title}</h2><p>{about.text}</p><p lang="am" className="mb-0">{about.am}</p></div>
          <div><h2>{help.title}</h2><ul>{help.links.map(([href, text]) => <li key={href}><Link href={href}>{text}</Link></li>)}</ul></div>
          <div><h2>{learn.title}</h2><ul>{learn.links.map(([href, text]) => <li key={href}><Link href={href}>{text}</Link></li>)}</ul></div>
          <div>
            <h2>{contact.title}</h2>
            <ul>
              <li>Your Woreda trade office</li>
              <li><a href={`tel:${freeCall}`}>Free call: {freeCall}</a></li>
              <li><Link href="/help#offices">Find an office</Link></li>
              <li><Link href="/sign-in">For businesses: sign in</Link></li>
              <li>{FREE_CALL_HOURS.short}</li>
            </ul>
          </div>
        </div>
        <div className="foot-note"><span>{note[0]}</span><span>{note[1]}</span></div>
      </div>
    </footer>
  );
}

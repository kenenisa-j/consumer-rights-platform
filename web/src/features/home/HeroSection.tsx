import Link from "next/link";
import { HERO, NOTICE, TRACK } from "@/content/home";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Am, Bi } from "@/components/ui/Bi";

const ASSURE: [IconName, string][] = [
  ["shield", "The business never sees your name or phone"],
  ["check", "Free to use"],
  ["users", "Woreda, Sub-City and City Bureau behind you"]
];

const QUICK: { href: string; icon: IconName; orange?: boolean; title: string; text: string }[] = [
  { href: "/complaint-or-tip", icon: "chat", orange: true, title: "Make a complaint", text: "Get a refund, replacement or repair" },
  { href: "/tip", icon: "flag", title: "Report unfair trade", text: "No account needed, stay anonymous" },
  { href: "#find-office", icon: "pin", title: "Find an office", text: "The trade office near you" }
];

export function HeroSection({ freeCall }: { freeCall: string }) {
  return (
    <>
      <section className="hero"><div className="container hero-grid">
        <div>
          <span className="kicker">{HERO.kicker}</span>
          <h1><Bi t={HERO.title} /></h1>
          <p className="lead">{HERO.leadBefore}<b>{freeCall}</b>.</p>
          <div className="btn-row">
            <Link className="btn btn--accent btn--lg btn--stack" href="/complaint-or-tip"><span>{HERO.complaint.en}</span><Am text={HERO.complaint.am} /></Link>
            <Link className="btn btn--secondary btn--lg btn--stack" href="/track"><span>{HERO.track.en}</span><Am text={HERO.track.am} /></Link>
          </div>
          <ul className="assure">{ASSURE.map(([icon, text]) => <li key={text}><Icon name={icon} />{text}</li>)}</ul>
        </div>

        <div className="hero-card">
          <h2>Check on a case</h2>
          <p>Enter the number you were given. No sign-in needed.</p>
          <form className="track-box" action="/track/result" method="get">
            <div className="field mb-0">
              <label className="visually-hidden" htmlFor="home-ref">{TRACK.label.en}</label>
              <input className="input" id="home-ref" name="ref" required placeholder={TRACK.example}
                defaultValue={TRACK.example} pattern={TRACK.pattern} autoComplete="off" />
              <p className="error-text">{TRACK.error}</p>
            </div>
            <button className="btn" type="submit"><Icon name="search" /> {TRACK.button}</button>
          </form>
          <hr />
          <ul className="quick-links">
            {QUICK.map(q => {
              const body = (
                <>
                  <span className={`icon-bubble${q.orange ? " icon-bubble--orange" : ""}`}><Icon name={q.icon} /></span>
                  <span><b>{q.title}</b><small>{q.text}</small></span>
                  <span className="arrow"><Icon name="arrow" /></span>
                </>
              );
              return <li key={q.href}>{q.href.startsWith("#") ? <a href={q.href}>{body}</a> : <Link href={q.href}>{body}</Link>}</li>;
            })}
          </ul>
        </div>
      </div></section>

      <section className="notice-strip"><div className="container">
        <Icon name="bell" />
        <p><b>{NOTICE.bold}</b>{NOTICE.text}<Link href="/how-to-complain">How it works</Link></p>
      </div></section>
    </>
  );
}

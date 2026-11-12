import Link from "next/link";
import { HERO, NOTICE, TRACK } from "@/content/home";
import { Icon } from "@/components/ui/Icon";
import { Am, Bi } from "@/components/ui/Bi";

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
        </div>
        <div className="paths">
          {HERO.paths.map(p => {
            const body = (
              <>
                <span className={`icon-bubble${p.orange ? " icon-bubble--orange" : ""}`}><Icon name={p.icon} /></span>
                <span><b>{p.title.en}</b><Am text={p.title.am} /><p>{p.text}</p><span className="go">{p.go} <Icon name="arrow" /></span></span>
              </>
            );
            return p.href.startsWith("#")
              ? <a key={p.href} className="path" href={p.href}>{body}</a>
              : <Link key={p.href} className="path" href={p.href}>{body}</Link>;
          })}
          <p className="small" style={{ color: "#dcebe4", margin: 0 }}>{HERO.compare} <Link href="/complaint-or-tip" style={{ color: "#fff" }}>Compare the two</Link></p>
        </div>
      </div></section>

      <section className="notice-strip"><div className="container">
        <Icon name="bell" />
        <p><b>{NOTICE.bold}</b>{NOTICE.text}<Link href="/how-to-complain">How it works</Link></p>
      </div></section>

      <section className="section section--tight"><div className="container">
        <div className="card"><form className="track-box" action="/track-result" method="get">
          <div className="field mb-0">
            <label htmlFor="home-ref"><Icon name="search" /> {TRACK.label.en} <Am text={TRACK.label.am} /></label>
            <input className="input" id="home-ref" name="ref" required placeholder={TRACK.example}
              defaultValue={TRACK.example} pattern={TRACK.pattern} autoComplete="off" />
            <p className="error-text">{TRACK.error}</p>
          </div>
          <button className="btn" type="submit">{TRACK.button}</button>
        </form></div>
      </div></section>
    </>
  );
}

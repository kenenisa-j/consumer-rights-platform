import Link from "next/link";
import { NEWS, FAQ } from "@/content/home";
import { SUB_CITIES } from "@/content/common";
import { Icon } from "@/components/ui/Icon";
import { Am, Bi } from "@/components/ui/Bi";

export function NewsSection() {
  return (
    <section className="section"><div className="container">
      <div className="card-head">
        <div><span className="kicker">{NEWS.kicker}</span><h2 className="mb-0"><Bi t={NEWS.title} /></h2></div>
        <Link className="btn btn--secondary btn--sm" href="/news">{NEWS.all}</Link>
      </div>
      <div className="grid-3">
        {NEWS.items.map(n => (
          <Link key={n.title} className="card news-card" href={n.href}>
            <span className="thumb"><Icon name={n.icon} /></span>
            <span className={`badge ${n.badge}`.trim()}>{n.tag}</span>
            <h3>{n.title}</h3><time dateTime={n.iso}>{n.date}</time>
          </Link>
        ))}
      </div>
    </div></section>
  );
}

export function FaqSection() {
  return (
    <section className="section section--alt"><div className="container narrow">
      <div className="section-title"><span className="kicker">{FAQ.kicker}</span><h2><Bi t={FAQ.title} /></h2></div>
      <div className="accordion">
        {FAQ.items.map(f => (
          <details key={f.q.en}>
            <summary>{f.q.en}<Am text={f.q.am} /></summary>
            <div className="body"><p>{f.a}</p></div>
          </details>
        ))}
      </div>
      <p className="mt-4 mb-0"><Link href="/help">{FAQ.link} <Icon name="arrow" /></Link></p>
    </div></section>
  );
}

export function HomeDialogs() {
  return (
    <>
      <div className="modal" id="find-office" role="dialog" aria-modal="true" aria-labelledby="fo-title">
        <div className="modal__box">
          <a className="modal__close" href="#" aria-label="Close">×</a>
          <span className="icon-bubble"><Icon name="pin" /></span>
          <h2 id="fo-title" className="mt-4">Find an office<Am text="ቢሮ ያግኙ" /></h2>
          <p className="muted">Choose your Sub-City to see the office near you.</p>
          <form action="/help" method="get">
            <div className="field"><label htmlFor="fo-sc">Sub-City</label>
              <select className="select" id="fo-sc" name="subcity">
                <option value="">Choose a Sub-City</option>
                {SUB_CITIES.map(s => <option key={s}>{s}</option>)}
              </select></div>
            <div className="btn-row">
              <button className="btn btn--accent" type="submit">Show offices</button>
              <a className="btn btn--secondary" href="#">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

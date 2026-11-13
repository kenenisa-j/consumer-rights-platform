import Link from "next/link";
import { DOORS, HOW, RIGHTS, FIGURES } from "@/content/home";
import { Icon } from "@/components/ui/Icon";
import { Bi } from "@/components/ui/Bi";

function SectionTitle({ kicker, title, intro }: { kicker: string; title: React.ComponentProps<typeof Bi>["t"]; intro?: string }) {
  return (
    <div className="section-title">
      <span className="kicker">{kicker}</span>
      <h2><Bi t={title} /></h2>
      {intro && <p>{intro}</p>}
    </div>
  );
}

export function DoorsSection() {
  return (
    <section className="section"><div className="container">
      <SectionTitle kicker={DOORS.kicker} title={DOORS.title} intro={DOORS.intro} />
      <div className="doors">
        {DOORS.items.map(d => (
          <a key={d.title} className="card door" href="#signin">
            <span className="icon-bubble"><Icon name={d.icon} /></span>
            <h3>{d.title}</h3><p>{d.text}</p>
            <span className="go">Sign in <Icon name="arrow" /></span>
          </a>
        ))}
      </div>
    </div></section>
  );
}

export function HowSection() {
  return (
    <section className="section section--alt"><div className="container">
      <SectionTitle kicker={HOW.kicker} title={HOW.title} intro={HOW.intro} />
      <ol className="how">{HOW.steps.map(([b, p]) => <li key={b}><b>{b}</b><p>{p}</p></li>)}</ol>
      <p className="mt-5 mb-0"><Link href="/how-to-complain">{HOW.link} <Icon name="arrow" /></Link></p>
    </div></section>
  );
}

export function RightsSection() {
  return (
    <section className="section"><div className="container">
      <SectionTitle kicker={RIGHTS.kicker} title={RIGHTS.title} />
      <div className="grid-3">
        {RIGHTS.items.map(r => (
          <Link key={r.href} className="card card--accent news-card" href={r.href}>
            <span className="icon-bubble"><Icon name={r.icon} /></span>
            <h3>{r.title}</h3><p className="muted mb-0">{r.text}</p>
          </Link>
        ))}
      </div>
      <p className="mt-5 mb-0"><Link href="/rights">{RIGHTS.link} <Icon name="arrow" /></Link></p>
    </div></section>
  );
}

export function FiguresSection() {
  return (
    <section className="section section--alt"><div className="container">
      <SectionTitle kicker={FIGURES.kicker} title={FIGURES.title} intro={FIGURES.intro} />
      <div className="figures">{FIGURES.items.map(([n, l]) => <div key={l} className="figure"><b>{n}</b><span>{l}</span></div>)}</div>
    </div></section>
  );
}

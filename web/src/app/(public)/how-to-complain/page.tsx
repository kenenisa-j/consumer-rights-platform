import Link from "next/link";
import { bi } from "@/content/types";
import { HOW_STEPS, HOW_TARGETS, HAVE_READY } from "@/content/rights";
import { PageHead } from "@/components/ui/PageHead";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "How a complaint works" };

// Prototype: public/how-to-complain.html. Eight steps, the climb, and what to have ready.
export default function HowToComplainPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "How a complaint works" }]} title={bi("How a complaint works", "ቅሬታ እንዴት ይስተናገዳል")}
        lead="Eight steps, from your complaint to an outcome. You get a message at each important step." />
      <section className="section"><div className="container"><div className="layout">
        <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {HOW_STEPS.map(s => (
            <li key={s.n} className="card" style={{ display: "flex", gap: "var(--s4)" }}>
              <span className="icon-bubble icon-bubble--orange" aria-hidden="true"><b>{s.n}</b></span>
              <div>
                <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>{s.title}</h2>
                <p style={{ marginBottom: 6 }}>{s.text}</p>
                <p className="small muted mb-0">Official status: <Badge>{s.status}</Badge></p>
              </div>
            </li>
          ))}
        </ol>
        <aside className="side">
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>How long it takes</h2>
            <table className="table"><tbody>{HOW_TARGETS.map(([a, b]) => <tr key={a}><td>{a}</td><td><b>{b}</b></td></tr>)}</tbody></table>
            <p className="small muted mb-0"><span className="badge badge--proposed">Proposed</span> Targets are not approved yet.</p></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>What to have ready</h2>
            <ul className="small mb-0">{HAVE_READY.map(t => <li key={t}>{t}</li>)}</ul></div>
          <Link className="btn btn--accent btn--block" href="/complaint/new">Make a complaint</Link>
        </aside>
      </div></div></section>
    </>
  );
}

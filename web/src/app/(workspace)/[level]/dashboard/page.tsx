import Link from "next/link";
import { notFound } from "next/navigation";
import { DASHBOARDS } from "@/mocks/gov-lists";
import { isGovLevel, LEVELS } from "@/features/gov/levels";

type Props = { params: Promise<{ level: string }> };

export async function generateMetadata({ params }: Props) {
  const { level } = await params;
  return { title: isGovLevel(level) ? `Dashboard · ${LEVELS[level].portal}` : "Dashboard" };
}

// Prototype: woreda|subcity|bureau/dashboard.html. One page, scoped to the level in the address.
export default async function DashboardPage({ params }: Props) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const d = DASHBOARDS[level];
  const max = Math.max(...(d.spread ?? []).map(s => s.value), 1);
  return (
    <>
      <div className="ws-title">
        <div><h1>{d.title}</h1><p>{d.subtitle}</p></div>
        {level === "bureau" && <Link className="btn btn--accent" href={`/${level}/intake`}>New complaint</Link>}
      </div>
      <div className="tiles">
        {d.tiles.map(t => <div key={t.label} className={`tile${t.alert ? " tile--alert" : ""}`}><b>{t.value}</b><span>{t.label}</span></div>)}
      </div>
      <div className="layout">
        <div className="stack">
          <div className="card">
            <h2>Needs your action</h2>
            <div className="table-wrap"><table className="table table--stack">
              <thead><tr><th scope="col">Case</th><th scope="col">What to do</th><th scope="col">Waiting</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
              <tbody>{d.rows.map(r => (
                <tr key={r.label}>
                  <td><b>{r.label}</b>{r.urgent && <> <span className="urgent">Urgent</span></>}<small>{r.sub}</small></td>
                  <td data-label="What to do">{r.what}</td><td data-label="Waiting">{r.waiting}</td>
                  <td className="num">{r.href && <Link className="btn btn--accent btn--sm" href={r.href}>Open</Link>}</td>
                </tr>))}</tbody>
            </table></div>
          </div>
          {d.spread && (
            <div className="card"><h2>Where the open cases are</h2>
              <div className="bars">{d.spread.map(s => (
                <div className="bar" key={s.label}><span className="bar__label">{s.label}</span>
                  <span className="bar__track"><i style={{ "--v": Math.round((s.value / max) * 100) } as React.CSSProperties} /></span><b>{s.value}</b></div>))}</div>
            </div>
          )}
        </div>
        <aside className="side">
          {d.notes.map(n => (
            <div key={n.title} className="card card--flat">
              <h2 style={{ fontSize: "1.05rem" }}>{n.title}</h2>
              {n.text && <p className={n.link || n.items ? "" : "mb-0"}>{n.text}</p>}
              {n.items && <ul className="small mb-0">{n.items.map(i => <li key={i}>{i}</li>)}</ul>}
              {n.link && <p className="mb-0"><Link href={n.link.href}>{n.link.label}</Link></p>}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { daysOpen, getOfficeCases, isClosed, isOverdue, needsAction } from "@/lib/gov-data";
import { statusOf } from "@/lib/case-status";
import { Alert } from "@/components/ui/Display";
import { isGovLevel, LEVELS } from "@/features/gov/levels";

type Props = { params: Promise<{ level: string }> };

export async function generateMetadata({ params }: Props) {
  const { level } = await params;
  return { title: isGovLevel(level) ? `Dashboard · ${LEVELS[level].portal}` : "Dashboard" };
}

const CHAIN = {
  woreda: "A complaint reaches you straight from a consumer, or moved up from a business. If you cannot resolve it, pass it to the Sub-City.",
  subcity: "Business, then Woreda, then Sub-City, then the City Bureau. Resolve a case here, or pass it to the City Bureau.",
  bureau: "Every complaint starts with the business or an office, and climbs one level at a time. You are the last level."
} as const;

// Prototype: woreda|subcity|bureau/dashboard.html. One page, scoped to the office of the signed-in person. Numbers come from the database.
export default async function DashboardPage({ params }: Props) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const data = await getOfficeCases();
  const cases = data?.cases ?? [];
  const open = cases.filter(c => !isClosed(c));
  const action = open.filter(needsAction);
  const spread = [["At a Woreda", "woreda"], ["At a Sub-City", "subcity"], ["At the City Bureau", "bureau"]] as const;
  const counts = spread.map(([label, l]) => ({ label, value: open.filter(c => c.handledBy?.level === l).length }));
  const max = Math.max(...counts.map(s => s.value), 1);
  const tiles = [
    { value: action.length, label: "New: waiting for you", alert: action.length > 0 }, { value: open.length, label: "Open cases", alert: false },
    { value: open.filter(c => c.urgent).length, label: "Health or safety risk", alert: false }, { value: open.filter(isOverdue).length, label: "Overdue", alert: false }
  ];
  return (
    <>
      <div className="ws-title">
        <div><h1>{data?.office.name ?? LEVELS[level].portal}</h1><p>What needs your office today</p></div>
        <Link className="btn btn--accent" href={`/${level}/intake`}>New complaint</Link>
      </div>
      {data === null && <Alert tone="warn" icon="flag" title="We could not load your office's cases.">Try again in a moment.</Alert>}
      <div className="tiles">{tiles.map(t => <div key={t.label} className={`tile${t.alert ? " tile--alert" : ""}`}><b>{t.value}</b><span>{t.label}</span></div>)}</div>
      <div className="layout">
        <div className="stack">
          <div className="card">
            <h2>Needs your action</h2>
            {action.length === 0 ? <p className="muted mb-0">Nothing is waiting. New complaints sent to your office appear here.</p> : (
              <div className="table-wrap"><table className="table table--stack">
                <thead><tr><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Waiting</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
                <tbody>{action.map(c => (
                  <tr key={c.reference}>
                    <td><b>{c.reference}</b>{c.urgent && <> <span className="urgent">Urgent</span></>}<small>{c.title} · {c.business}</small></td>
                    <td data-label="Status">{statusOf(c.status).label}</td><td data-label="Waiting">{daysOpen(c.createdAt)}</td>
                    <td className="num"><Link className="btn btn--accent btn--sm" href={`/${level}/cases/${c.reference}`}>Open</Link></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </div>
          {level !== "woreda" && (
            <div className="card"><h2>Where the open cases are</h2>
              <div className="bars">{counts.map(s => (
                <div className="bar" key={s.label}><span className="bar__label">{s.label}</span>
                  <span className="bar__track"><i style={{ "--v": Math.round((s.value / max) * 100) } as React.CSSProperties} /></span><b>{s.value}</b></div>))}</div>
            </div>
          )}
        </div>
        <aside className="side">
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Your place in the chain</h2><p className="mb-0">{CHAIN[level]}</p></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Tips</h2><p>Market problems reported by people, kept apart from complaints.</p>
            <p className="mb-0"><Link href={`/${level}/tips`}>Open the tips</Link></p></div>
        </aside>
      </div>
    </>
  );
}

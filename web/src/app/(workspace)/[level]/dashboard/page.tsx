import Link from "next/link";
import { notFound } from "next/navigation";
import { DASHBOARDS } from "@/mocks/gov-lists";
import { isGovLevel, LEVELS } from "@/features/gov/levels";
import type { LevelDashboard, ActionRow } from "@/types/gov";

type Props = { params: Promise<{ level: string }> };

export async function generateMetadata({ params }: Props) {
  const { level } = await params;
  return { title: isGovLevel(level) ? `Dashboard · ${LEVELS[level].portal}` : "Dashboard" };
}

// Prototype: woreda|subcity|bureau/dashboard.html. One page, scoped to the level in the address.
export default async function DashboardPage({ params }: Props) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();

  let d: LevelDashboard = DASHBOARDS[level];

  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const [overviewRes, casesRes] = await Promise.all([
        fetch(`${API_URL}/api/government/reports/overview`, {
          headers: { cookie: jar.toString() },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/government/cases?limit=10`, {
          headers: { cookie: jar.toString() },
          cache: "no-store",
        }),
      ]);

      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        const casesBody = casesRes.ok ? await casesRes.json() : null;
        const liveCases = Array.isArray(casesBody?.cases) ? casesBody.cases : [];

        const actionRows: ActionRow[] = liveCases
          .filter((c: any) => c.isPendingAcceptance || c.status === "RECEIVED_BY_OFFICE" || c.status === "ESCALATED_TO_GOVERNMENT")
          .map((c: any) => ({
            label: c.referenceNumber,
            sub: `${c.category || "Complaint"} · ${c.merchantName || "Business"}`,
            what: c.isPendingAcceptance ? "Pending transfer: review and accept" : "New complaint: accept and assign",
            waiting: "Action required",
            href: `/${level}/cases/${c.referenceNumber}`,
            urgent: Boolean(c.slaDeadline && new Date(c.slaDeadline) < new Date()),
          }));

        const rows = actionRows.length > 0 ? actionRows : d.rows;

        const tiles = [
          { value: String(ov.openCount ?? d.tiles[0].value), label: "My open cases", alert: (ov.openCount || 0) > 0 },
          { value: String(ov.totalComplaints ?? d.tiles[1].value), label: "Total complaints" },
          { value: String(ov.resolvedCount ?? 0), label: "Resolved" },
          { value: String(ov.overdueCount ?? 0), label: "Overdue", alert: (ov.overdueCount || 0) > 0 },
        ];

        d = {
          ...d,
          tiles,
          rows,
        };
      }
    }
  } catch {
    // fallback to demo mock data
  }

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

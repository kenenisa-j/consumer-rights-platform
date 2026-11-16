import Link from "next/link";
import { requirePortal } from "@/lib/session";
import { freeCallNumber } from "@/lib/config";
import { serverGet } from "@/lib/server-api";
import { LEVEL_NAME, niceDate, statusOf } from "@/lib/case-status";
import { Alert, CallBox, StatusPill } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata = { title: "My cases" };

interface MyCase {
  reference: string; title: string; status: string; business: string; urgent: boolean; category: { nameEn: string };
  handledBy: { name: string; level: keyof typeof LEVEL_NAME } | null; createdAt: string; updatedAt: string;
}

const NEEDS_ANSWER = new Set(["BUSINESS_OFFER_PENDING", "SETTLEMENT_OFFERED"]);

/** The page a consumer lands on after signing in: who they are, what needs them, then every complaint. Cases come from the database. */
export default async function MyCasesPage() {
  const me = await requirePortal("consumer", "/my-cases");
  const cases = await serverGet<MyCase[]>("/complaints");
  const first = me.fullName.split(" ")[0];
  const open = (cases ?? []).filter(c => statusOf(c.status).stage !== "resolved");
  const done = (cases ?? []).filter(c => statusOf(c.status).stage === "resolved");
  const waiting = open.filter(c => NEEDS_ANSWER.has(c.status));
  const tiles: { icon: IconName; n: number; label: string; tone?: string }[] = [
    { icon: "folder", n: (cases ?? []).length, label: "Complaints" },
    { icon: "clock", n: open.length, label: "Being handled" },
    { icon: "bell", n: waiting.length, label: "Need your answer", tone: waiting.length ? "warn" : undefined },
    { icon: "check", n: done.length, label: "Closed" }
  ];

  return (
    <>
      <section className="dash-head"><div className="container">
        <div className="dash-head__row">
          <div>
            <span className="kicker">My cases · የእኔ ጉዳዮች</span>
            <h1>Hello, {first}</h1>
            <p>Here is what is happening with your complaints.</p>
          </div>
          <div className="btn-row">
            <Link className="btn btn--accent btn--lg btn--stack" href="/complaint/new"><span>Make a new complaint</span><Am text="አዲስ ቅሬታ" /></Link>
            <Link className="btn btn--secondary btn--lg" href="/track">Track a case</Link>
          </div>
        </div>
        <ul className="stat-tiles">
          {tiles.map(t => (
            <li key={t.label} className={t.tone ? `stat-tile stat-tile--${t.tone}` : "stat-tile"}>
              <span className="icon-bubble"><Icon name={t.icon} /></span><b>{t.n}</b><span>{t.label}</span>
            </li>
          ))}
        </ul>
      </div></section>

      <section className="section section--tight"><div className="container">
        <div className="dash-grid">
          <div className="stack">
            {waiting.length > 0 && (
              <Alert tone="warn" icon="bell" title={`${waiting.length} ${waiting.length === 1 ? "complaint needs" : "complaints need"} your answer`}>
                <ul className="mb-0">{waiting.map(c => <li key={c.reference}><Link href={`/cases/${c.reference}`}>{c.reference}: {statusOf(c.status).label}</Link></li>)}</ul>
              </Alert>
            )}
            <div className="list-head"><h2>Your complaints</h2><Link className="btn btn--ghost btn--sm" href="/notifications">Notifications</Link></div>
            {cases === null ? (
              <Alert tone="warn" icon="flag" title="We could not load your complaints.">Try again in a moment. If it keeps happening, call the free line.</Alert>
            ) : cases.length === 0 ? (
              <div className="empty-hero">
                <span className="icon-bubble icon-bubble--orange"><Icon name="chat" /></span>
                <h3>You have no complaints yet</h3>
                <p>Bought something faulty, short-weighted or overpriced? Tell us. It takes about five minutes.</p>
                <Link className="btn btn--accent" href="/complaint/new">Make a complaint</Link>
              </div>
            ) : (
              <ul className="case-cards">
                {cases.map(c => {
                  const st = statusOf(c.status);
                  return (
                    <li key={c.reference}>
                      <Link className="case-card" href={`/cases/${c.reference}`}>
                        <span className="case-card__top"><b className="case-card__ref">{c.reference}</b><StatusPill tone={st.tone}>{st.label}</StatusPill></span>
                        <span className="case-card__title">{c.title}</span>
                        <span className="case-card__meta">
                          <span><Icon name="building" /> {c.business}</span>
                          <span><Icon name="pin" /> {c.handledBy ? c.handledBy.name : "With the business"}</span>
                          <span><Icon name="clock" /> Updated {niceDate(c.updatedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <aside className="stack" aria-label="My account">
            <div className="card card--flat"><h2 className="side-title"><Icon name="user" /> My account</h2>
              <dl className="kv" style={{ gridTemplateColumns: "1fr" }}>
                <div style={{ display: "contents" }}><dt>Name</dt><dd>{me.fullName}</dd></div>
                <div style={{ display: "contents" }}><dt>Phone</dt><dd>{me.phoneNumber}</dd></div>
                <div style={{ display: "contents" }}><dt>Email</dt><dd>{me.email ?? "Not given"}</dd></div>
              </dl></div>
            <div className="card card--flat"><h2 className="side-title"><Icon name="flag" /> Tips</h2>
              <p className="small">Tips are not linked to your account, so they do not appear here. Check one with its private code.</p>
              <div className="btn-row"><Link className="btn btn--secondary btn--sm" href="/track?kind=tip">Check a tip</Link>
                <Link className="btn btn--ghost btn--sm" href="/tip">Report unfair trade</Link></div></div>
            <CallBox freeCall={freeCallNumber()} text="Need help? Call free." />
          </aside>
        </div>
      </div></section>
    </>
  );
}

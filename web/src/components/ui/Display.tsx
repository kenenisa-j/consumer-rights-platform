import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Am } from "./Bi";
import type { Bilingual } from "@/content/types";

export type Tone = "info" | "ok" | "warn" | "bad";

export function Alert({ tone, icon = "bell", title, children, role }: {
  tone?: Tone | "plain"; icon?: IconName; title?: ReactNode; children?: ReactNode; role?: "status" | "alert";
}) {
  const cls = tone && tone !== "plain" && tone !== "info" ? ` alert--${tone}` : "";
  return (
    <div className={`alert${cls}`} role={role}>
      <Icon name={icon} />
      <div>{title && <strong>{title}</strong>}{children}</div>
    </div>
  );
}

export function StatusPill({ tone = "info", children }: { tone?: Tone | "grey"; children: ReactNode }) {
  return <span className={`status${tone === "grey" ? "" : ` status--${tone}`}`}>{children}</span>;
}

/** Key/value list. Rows with an undefined value are skipped. */
export function KeyValue({ rows, single }: { rows: ReadonlyArray<readonly [string, ReactNode | undefined]>; single?: boolean }) {
  return (
    <dl className="kv" style={single ? { gridTemplateColumns: "1fr" } : undefined}>
      {rows.filter(([, v]) => v !== undefined).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export interface TimelineItem { title: string; when?: string; iso?: string; text?: string; state: "done" | "now" | "todo" }

export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((u, i) => (
        <li key={`${u.title}-${i}`} className={u.state}>
          <span className="dot" /><b>{u.title}</b>
          {u.when && <time dateTime={u.iso}>{u.when}</time>}
          {u.text && <p>{u.text}</p>}
        </li>
      ))}
    </ol>
  );
}

/** The climb: business, Woreda, Sub-City, City Bureau, resolved. `current` is the active stage index. */
export function ProgressTrack({ stages, current, resolved }: { stages: readonly Bilingual[]; current: number; resolved?: boolean }) {
  return (
    <ol className="track" aria-label="Progress of the complaint">
      {stages.map((s, i) => {
        const state = resolved || i < current ? "done" : i === current ? "now" : "todo";
        return <li key={s.en} className={state} aria-current={state === "now" ? "step" : undefined}>{s.en}<Am text={s.am} /></li>;
      })}
    </ol>
  );
}

export function Accordion({ items }: { items: ReadonlyArray<{ id?: string; q: Bilingual; a: ReactNode }> }) {
  return (
    <div className="accordion">
      {items.map(i => (
        <details key={i.q.en} id={i.id}>
          <summary>{i.q.en}<Am text={i.q.am} /></summary>
          <div className="body">{typeof i.a === "string" ? <p>{i.a}</p> : i.a}</div>
        </details>
      ))}
    </div>
  );
}

export function CallBox({ freeCall, text = "Questions? Call free." }: { freeCall: string; text?: string }) {
  return (
    <div className="call-box">
      <Icon name="phone" />
      <div>
        <b>{text}</b>
        <a className="call-box__num" href={`tel:${freeCall}`}>Call {freeCall}</a>
        <span className="small muted">Monday to Friday, 8:30 to 17:30. <span lang="am">ነጻ የስልክ መስመር</span></span>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="card center"><h2 className="h3">{title}</h2>{children}</div>;
}

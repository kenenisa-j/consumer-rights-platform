"use client";

import Link from "next/link";
import type { GovCase, GovLevel } from "@/types/gov";
import { KeyValue, Timeline, type TimelineItem } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { chainFor } from "./chain";

export function Chain({ data, viewer }: { data: GovCase; viewer: GovLevel }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: "1.05rem" }}>Where this case is</h2>
      <ol className="chain">{chainFor(data, viewer).map(s => (
        <li key={s.label} className={s.state}><b>{s.label}</b><span>{s.note}</span></li>))}</ol>
    </div>
  );
}

export function ReachedCard({ data }: { data: GovCase }) {
  return (
    <div className="card card--accent">
      <h2 style={{ fontSize: "1.05rem" }}>{data.reached.title}</h2>
      <p className={data.handovers.length ? "" : "mb-0"}>{data.reached.text}</p>
      {data.handovers.map(h => (
        <div key={h.title} className="alert mt-4"><Icon name="file" /><div>
          <strong>Handover note: {h.title}</strong>
          <p className="small muted">{h.from} · {h.when}</p><p className="mb-0">{h.text}</p></div></div>
      ))}
    </div>
  );
}

export function OverviewPanel({ data }: { data: GovCase }) {
  return (
    <div className="stack">
      <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>The complaint</h2><KeyValue rows={data.complaint} /></div>
      <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>The consumer</h2><KeyValue rows={data.consumer} />
        <p className="small muted mt-4 mb-0">Visible to government staff only. The business sees &ldquo;Consumer 00123&rdquo;.</p></div>
      {data.solution && (
        <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Proposed solution</h2>
          <KeyValue rows={[["Solution", data.solution.type], ["Amount", data.solution.amount ? `${data.solution.amount} ETB` : "—"], ["To be done by", data.solution.by || "—"], ["Terms", data.solution.terms]]} /></div>
      )}
      {data.meeting && <div className="alert"><Icon name="calendar" /><div><strong>Meeting</strong><p className="mb-0">{data.meeting}</p></div></div>}
    </div>
  );
}

export function MessagesPanel({ data, level }: { data: GovCase; level: GovLevel }) {
  return (
    <div className="card card--flat">
      <h2 style={{ fontSize: "1.05rem" }}>Between the consumer and the {data.onPlatform ? "business" : "office"}</h2>
      {data.thread.length === 0 ? <p className="muted">No messages yet.</p> : (
        <ul className="thread">{data.thread.map((m, i) => (
          <li key={`${m.when}-${i}`} className={m.side === "office" ? "office" : undefined}>
            <div className="meta"><b>{m.who}</b><time>{m.when}</time></div><p>{m.text}</p></li>))}</ul>
      )}
      <p className="small mb-0 mt-4"><Link href={`/${level}/messages`}>Open Messages</Link> to write to the consumer or the business.</p>
    </div>
  );
}

export function EvidencePanel({ data }: { data: GovCase }) {
  return (
    <div className="card card--flat">
      <h2 style={{ fontSize: "1.05rem" }}>Evidence from the consumer</h2>
      {data.evidence.length === 0 ? <p className="muted">No files added.</p> : (
        <ul className="file-list link-list">{data.evidence.map(f => (
          <li key={f.name}><span style={{ flex: 1 }}><b>{f.name}</b><br /><small className="muted">{f.note} · {f.size}</small></span>
            <span className={`badge ${f.shared ? "badge--green" : ""}`.trim()}>{f.shared ? "Shared with the business" : "Officers only"}</span></li>))}</ul>
      )}
      <p className="small muted mb-0 mt-4">File preview arrives with file storage in the backend.</p>
    </div>
  );
}

export function HistoryPanel({ data }: { data: GovCase }) {
  const items: TimelineItem[] = data.history.map((h, i) => ({ title: h.title, when: h.when, iso: h.iso, text: h.text, state: i === 0 && !data.closed ? "now" : "done" }));
  return <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>History</h2><Timeline items={items} /></div>;
}

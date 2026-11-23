"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { BizCase } from "@/types/biz";
import { stamp } from "@/lib/stamp";
import { Alert, CallBox, KeyValue, StatusPill, Timeline, type TimelineItem } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Am } from "@/components/ui/Bi";
import { applyBizAction, type BizAction } from "./biz-case-state";
import { BizActions, PendingNote } from "./BizActions";

/** The business's limited view of one complaint. State changes go through biz-case-state. */
export function BizCaseView({ initial, freeCall }: { initial: BizCase; freeCall: string }) {
  const [data, setData] = useState(initial);
  const latest = useRef(initial);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const dispatch = useCallback((action: BizAction) => {
    const r = applyBizAction(latest.current, action, stamp());
    latest.current = r.next;
    setData(r.next);
    setNotice({ text: r.notice, ok: r.ok });

    if (r.ok) {
      const ref = latest.current.reference;
      if (action.type === "reply") {
        fetch(`/api/business/cases/${ref}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: action.explanation }),
        }).catch(() => {});
        if (action.offer === "refund" && action.amount) {
          fetch(`/api/business/cases/${ref}/offer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              offerType: "FULL_REFUND",
              refundAmount: Number(action.amount),
              termsDescription: action.detail || "Full refund offer",
            }),
          }).catch(() => {});
        }
      } else if (action.type === "offer_refund") {
        fetch(`/api/business/cases/${ref}/offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            offerType: "FULL_REFUND",
            refundAmount: Number(action.amount) || 0,
            termsDescription: `Refund offer: ${action.when}`,
          }),
        }).catch(() => {});
      } else if (action.type === "different_offer") {
        fetch(`/api/business/cases/${ref}/offer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            offerType: action.kind === "replacement" ? "REPLACEMENT" : "OTHER",
            refundAmount: Number(action.amount) || undefined,
            termsDescription: action.message || action.kind,
          }),
        }).catch(() => {});
      }
    }
  }, []);

  const history: TimelineItem[] = data.history.map((h, i) => ({ title: h.title, when: h.when, iso: h.iso, text: h.text, state: i === 0 && !data.closed ? "now" : "done" }));
  return (
    <>
      <nav aria-label="You are here"><ol className="crumbs"><li><Link href="/business/complaints">Consumer complaints</Link></li><li aria-current="page">{data.reference}</li></ol></nav>
      <div className="ws-title"><div>
        <h1>{data.title}</h1>
        <p>{data.reference} · <StatusPill tone={data.status.tone}>{data.status.label}</StatusPill> <span className="small muted">Official status: {data.official}</span></p>
      </div></div>

      <div aria-live="polite" className="toast">{notice && <Alert tone={notice.ok ? "ok" : "bad"} icon={notice.ok ? "check" : "flag"} role="status" title={notice.text} />}</div>

      <div className="layout"><div className="stack">
        {data.pending === "reply" && data.deadline && (
          <Alert tone="warn" icon="clock" title={`Please reply by ${data.deadline}`}>
            <p className="mb-0">The consumer is waiting for your reply. If you agree a fair solution together, the complaint is resolved and the government does not need to act.</p></Alert>
        )}
        {data.banner && <Alert tone={data.banner.tone} icon="bell" title={data.banner.title}>{data.banner.text && <p>{data.banner.text}</p>}</Alert>}
        <BizActions data={data} onAction={dispatch} />
        <PendingNote data={data} />

        <div className="card"><h2>What the consumer says<Am text="ሸማቹ የሚሉት" /></h2>
          <KeyValue rows={data.consumerSays} /><p className="mt-4 mb-0"><b>Description</b><br />{data.narrative}</p></div>

        {data.thread.length > 0 && (
          <div className="card"><h2>Messages<Am text="መልዕክቶች" /></h2>
            <ul className="thread">{data.thread.map(m => (
              <li key={m.id} className={m.from === "office" ? "office" : undefined}><div className="meta"><b>{m.who}</b><time>{m.when}</time></div><p>{m.text}</p></li>))}</ul>
            <p className="small mb-0 mt-4"><Link href="/business/messages">Open Messages</Link> to talk to the consumer and the offices.</p></div>
        )}

        <div className="card"><h2>History</h2><Timeline items={history} /></div>
      </div>

      <aside className="side">
        <div className="restricted"><Icon name="shield" /><div><b>Limited view</b>
          <p className="mb-0 small">To protect the consumer, you see only what you need to reply to them.</p>
          <ul className="small"><li>The consumer&apos;s name, phone and address are not shown</li><li>Only this complaint is shown</li></ul></div></div>
        {data.handledBy && <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Handled by</h2><KeyValue single rows={data.handledBy} /></div>}
        {data.evidence.length > 0 && (
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}><Icon name="file" /> Evidence shared with you</h2>
            <ul className="file-list link-list">{data.evidence.map(f => <li key={f.name}><span style={{ flex: 1 }}><b>{f.name}</b><br /><small className="muted">{f.note} · {f.size}</small></span></li>)}</ul></div>
        )}
        <CallBox freeCall={freeCall} text="Questions about this complaint? Call free." />
      </aside></div>
    </>
  );
}

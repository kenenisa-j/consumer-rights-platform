"use client";

import { useCallback, useRef, useState } from "react";
import type { CaseData } from "@/types/case";
import { stamp } from "@/lib/stamp";
import { STAGES, STAGE_INDEX } from "@/content/common";
import { Alert, ProgressTrack, StatusPill } from "@/components/ui/Display";
import { applyAction, type CaseAction } from "./case-state";
import { CaseActions } from "./CaseActions";
import { CaseDialogs, type DialogName } from "./CaseDialogs";
import { CaseSide, DetailsCard, MessageThread, ReplyForm, UpdatesCard } from "./CaseSections";

const NO_REPLY = new Set(["info_required", "outside"]);

/** The consumer's case: progress, what to do next, messages, history. State changes go through case-state. */
export function CaseView({ initial, freeCall }: { initial: CaseData; freeCall: string }) {
  const [data, setData] = useState(initial);
  const latest = useRef(initial); // always the newest case, so actions never run twice or on stale data
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [dialog, setDialog] = useState<DialogName | null>(null);

  const dispatch = useCallback((action: CaseAction) => {
    const r = applyAction(latest.current, action, stamp());
    latest.current = r.next;
    setData(r.next);
    setNotice({ text: r.notice, ok: r.ok });

    if (r.ok) {
      const ref = latest.current.reference;
      if (action.type === "accept_offer") {
        const offerId = latest.current.offer?.id;
        if (offerId) {
          fetch(`/api/cases/${ref}/offers/${offerId}/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
          }).catch(() => {});
        }
      } else if (action.type === "counter_offer") {
        const offerId = latest.current.offer?.id;
        const reason = `${action.ask}. ${action.text}`.trim();
        if (offerId) {
          fetch(`/api/cases/${ref}/offers/${offerId}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ reason }),
          }).catch(() => {});
        }
        fetch(`/api/cases/${ref}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: `Counter-offer: ${reason}` }),
        }).catch(() => {});
      } else if (action.type === "escalate") {
        fetch(`/api/cases/${ref}/escalate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ reason: action.reason }),
        }).catch(() => {});
      } else if (action.type === "send_message") {
        fetch(`/api/cases/${ref}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: action.text }),
        }).catch(() => {});
      }
    }
  }, []);

  const showTrack = data.pending !== "outside";
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Complaint {data.reference}</span>
        <h1>{data.title}</h1>
        <p className="mb-0"><StatusPill tone={data.status.tone}>{data.status.label}</StatusPill>{" "}
          <span className="small muted">Official status: {data.official}</span></p>
      </div></section>

      <section className="section"><div className="container">
        {showTrack && <div className="card mb-5"><ProgressTrack stages={STAGES} current={STAGE_INDEX[data.stage]} resolved={data.stage === "resolved"} /></div>}
        <div className="layout"><div className="stack">
          <div aria-live="polite" className="toast">
            {notice && <Alert tone={notice.ok ? "ok" : "bad"} icon={notice.ok ? "shield" : "flag"} role="status" title={notice.text} />}
          </div>
          {data.banner && <Alert tone={data.banner.tone} icon="bell" title={data.banner.title}>{data.banner.text && <p>{data.banner.text}</p>}</Alert>}
          <CaseActions data={data} onAction={dispatch} onOpen={setDialog} />
          <MessageThread data={data} />
          {!data.closed && !data.readOnly && !NO_REPLY.has(data.pending) &&
            <ReplyForm counterpart={data.counterpart} onSend={text => dispatch({ type: "send_message", text })} />}
          <UpdatesCard data={data} />
          <DetailsCard data={data} />
          {data.stage !== "resolved" && !data.closed && (
            <div className="card card--tint"><h2 style={{ fontSize: "1.05rem" }}>If it is not resolved here</h2>
              <p className="small mb-0">Your complaint moves up one level: Woreda, then the Sub-City, then the City Bureau. The City Bureau is the last level. Each office can see what was done before.</p></div>
          )}
        </div>
        <CaseSide data={data} freeCall={freeCall} onWithdraw={() => setDialog("withdraw")} /></div>
      </div></section>
      <CaseDialogs open={dialog} paid={data.details.paid} onClose={() => setDialog(null)} onAction={dispatch} />
    </>
  );
}

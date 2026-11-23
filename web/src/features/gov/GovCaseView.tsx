"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { GovCase, GovLevel } from "@/types/gov";
import { stamp } from "@/lib/stamp";
import { Alert, StatusPill } from "@/components/ui/Display";
import { Tabs } from "@/components/ui/Tabs";
import { applyGovAction, LEVEL_LABEL, type GovAction } from "./gov-case-state";
import { GovCaseDialogs, type GovDialog } from "./GovCaseDialogs";
import { Chain, EvidencePanel, HistoryPanel, MessagesPanel, OverviewPanel, ReachedCard } from "./GovCaseSections";
import { LEVELS } from "./levels";

function Actions({ data, level, onOpen }: { data: GovCase; level: GovLevel; onOpen: (d: GovDialog) => void }) {
  const cfg = LEVELS[level];
  if (data.closed) {
    return <Alert tone={data.resolvedAt ? "ok" : "plain"} icon="check" title={data.referredTo ? `Referred to ${data.referredTo}` : "This case is closed"}>
      The consumer and the business were told. The history keeps every step.</Alert>;
  }
  if (data.heldBy !== level) {
    return <Alert icon="building" title={`This case is now with the ${LEVEL_LABEL[data.heldBy]}`}>
      <p className="mb-0">You can still read everything you recorded. Only that office can act on it now.</p></Alert>;
  }
  if (!data.accepted) {
    return (
      <div className="card actions-card">
        <h2 style={{ fontSize: "1.05rem" }}>What do you want to do?</h2>
        <button className="btn btn--accent" type="button" onClick={() => onOpen("accept")}>Accept and assign</button>
        <p className="small muted mb-0">Accept the case first, then you can record visits, meetings and the outcome.</p>
      </div>
    );
  }
  return (
    <div className="card actions-card">
      <h2 style={{ fontSize: "1.05rem" }}>What do you want to do?</h2>
      <button className="btn btn--secondary" type="button" onClick={() => onOpen("visit")}>1. Record the visit</button>
      <button className="btn btn--secondary" type="button" onClick={() => onOpen("meeting")}>2. Set a meeting</button>
      <button className="btn btn--secondary" type="button" onClick={() => onOpen("solution")}>3. Propose a solution</button>
      <button className="btn btn--accent" type="button" disabled={!data.solution} title={data.solution ? undefined : "Propose a solution first"}
        onClick={() => onOpen("paid")}>4. Record the refund paid</button>
      {!data.onPlatform && <button className="btn btn--secondary" type="button" onClick={() => onOpen("contact")}>Record contact with the business</button>}
      <button className="btn btn--secondary" type="button" onClick={() => onOpen("resolve")}>Mark as resolved</button>
      {cfg.upTo
        ? <button className="btn btn--ghost" type="button" onClick={() => onOpen("pass_up")}>Not resolved: pass to {cfg.upTo}</button>
        : <button className="btn btn--ghost" type="button" onClick={() => onOpen("refer")}>Refer for further action</button>}
      <p className="small muted mb-0">{cfg.upTo ? `If you cannot resolve it, pass it to ${cfg.upTo}. You can still follow it.` : "You are the last level. Settle it, or refer it for further action."}</p>
    </div>
  );
}

/** The officer's case workspace. Every change goes through gov-case-state, which enforces the climb. */
export function GovCaseView({ initial, level }: { initial: GovCase; level: GovLevel }) {
  const cfg = LEVELS[level];
  const [data, setData] = useState(initial);
  const latest = useRef(initial);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [dialog, setDialog] = useState<GovDialog | null>(null);

  const dispatch = useCallback((action: GovAction) => {
    const r = applyGovAction(latest.current, level, action, stamp(), `${cfg.person.name}, ${cfg.office}`);
    latest.current = r.next;
    setData(r.next);
    setNotice({ text: r.notice, ok: r.ok });

    if (r.ok) {
      const ref = latest.current.reference;
      if (action.type === "accept") {
        fetch(`/api/government/cases/${ref}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ officerId: action.officer || "self", notes: action.note }),
        }).catch(() => {});
      } else if (action.type === "record_visit") {
        fetch(`/api/government/cases/${ref}/inspections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            inspectionType: "ON_SITE_VERIFICATION",
            inspectionDate: new Date(`${action.date}T${action.time || "10:00"}:00.000Z`).toISOString(),
            locationName: "Merchant Premises",
            summary: action.findings,
          }),
        }).catch(() => {});
      } else if (action.type === "set_meeting") {
        fetch(`/api/government/cases/${ref}/inspections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            inspectionType: "CONCILIATION_MEETING",
            inspectionDate: new Date(`${action.date}T${action.time || "14:00"}:00.000Z`).toISOString(),
            locationName: action.place,
            summary: `Meeting scheduled at ${action.place}`,
          }),
        }).catch(() => {});
      } else if (action.type === "propose_solution") {
        fetch(`/api/government/cases/${ref}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            outcome: "SUBSTANTIATED",
            statusTarget: "RESOLVED_ADMINISTRATIVE_ORDER",
            reasoning: action.terms,
            remedyInstruction: action.kind,
            complianceDeadline: action.by ? new Date(action.by).toISOString() : undefined,
          }),
        }).catch(() => {});
      } else if (action.type === "record_paid") {
        fetch(`/api/government/cases/${ref}/verify-compliance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            isCompliant: true,
            verificationNotes: `Payment of ${action.amount} ETB confirmed on ${action.date} ${action.time}`,
          }),
        }).catch(() => {});
        fetch(`/api/government/cases/${ref}/close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            closureReason: "RESOLVED_MUTUAL_AGREEMENT",
            closureNotes: `Refund of ${action.amount} ETB recorded. Case mutually resolved.`,
          }),
        }).catch(() => {});
      } else if (action.type === "resolve") {
        fetch(`/api/government/cases/${ref}/close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            closureReason: "RESOLVED_COMPLIANCE_CONFIRMED",
            closureNotes: action.note || "Resolved by administrative order.",
          }),
        }).catch(() => {});
      } else if (action.type === "pass_up") {
        fetch(`/api/government/cases/${ref}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            handoverNote: `${action.why}. ${action.note}`.trim(),
            direction: "UPWARD_ESCALATION",
          }),
        }).catch(() => {});
      } else if (action.type === "refer") {
        fetch(`/api/government/cases/${ref}/close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            closureReason: "REFERRED_TO_COURT",
            closureNotes: `Referred to ${action.to}. ${action.note}`.trim(),
          }),
        }).catch(() => {});
      }
    }
  }, [level, cfg]);

  return (
    <>
      <nav aria-label="You are here"><ol className="crumbs">
        <li><Link href={`/${level}/cases`}>Cases</Link></li><li aria-current="page">{data.reference}</li></ol></nav>
      <div className="ws-title"><div>
        <h1>{data.title}</h1>
        <p>{data.reference} · <StatusPill tone={data.status.tone}>{data.status.label}</StatusPill>{data.officer && <> · Officer {data.officer}</>}
          <span className="small muted"> · Official status: {data.official}</span></p>
      </div></div>

      <div aria-live="polite" className="toast">{notice && <Alert tone={notice.ok ? "ok" : "bad"} icon={notice.ok ? "check" : "flag"} role="status" title={notice.text} />}</div>

      <div className="stack">
        <Chain data={data} viewer={level} />
        <ReachedCard data={data} />
        <div className="layout">
          <div className="card">
            <Tabs label="Case sections" tabs={[
              { id: "overview", label: "Overview", panel: <OverviewPanel data={data} /> },
              { id: "messages", label: "Messages", panel: <MessagesPanel data={data} level={level} /> },
              { id: "evidence", label: "Evidence", panel: <EvidencePanel data={data} /> },
              { id: "history", label: "History", panel: <HistoryPanel data={data} /> }]} />
          </div>
          <aside className="side"><Actions data={data} level={level} onOpen={setDialog} /></aside>
        </div>
      </div>
      <GovCaseDialogs open={dialog} level={level} onClose={() => setDialog(null)} onAction={dispatch} />
    </>
  );
}

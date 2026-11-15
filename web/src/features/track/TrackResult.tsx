"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { readHandoff, saveHandoff } from "@/lib/handoff";
import { apiGet } from "@/lib/api";
import { LEVEL_NAME, niceDate, statusOf } from "@/lib/case-status";
import { STAGES, STAGE_INDEX } from "@/content/common";
import { Alert, ProgressTrack, StatusPill } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { TrackQuery } from "./TrackForms";

interface ComplaintHit { found: true; reference: string; status: string; title: string; category: { nameEn: string }; business: string;
  handledBy: { name: string; level: keyof typeof LEVEL_NAME } | null; createdAt: string; updatedAt: string; lastNote: string | null }
interface TipHit { found: true; reference: string; status: string; label: string; receivedAt: string; reviewedBy: string }
type Miss = { found: false };

type View =
  | { s: "loading" } | { s: "ask"; ref: string } | { s: "none" } | { s: "down"; q: TrackQuery }
  | { s: "complaint"; data: ComplaintHit } | { s: "tip"; data: TipHit };

const TIP_MEANING: Record<string, string> = {
  received: "Your tip arrived. An officer will read it soon.", under_review: "An officer is reading the tip and deciding on a follow-up.",
  follow_up_planned: "A visit or check is planned.", converted_to_case: "The tip led to an official case.",
  closed_action_taken: "Action was taken. Tips do not show the findings, so people who report stay safe.", closed_no_action: "The officer decided no action was needed."
};

export function TrackResult() {
  const refParam = useSearchParams().get("ref")?.toUpperCase() ?? "";
  const [view, setView] = useState<View>({ s: "loading" });

  const run = async (q: TrackQuery) => {
    // One message for "no such number" and "wrong digits": it must not reveal which numbers exist.
    const path = q.kind === "tip"
      ? `/api/track/tip?reference=${encodeURIComponent(q.ref)}&code=${encodeURIComponent(q.secret)}`
      : `/api/track/complaint?reference=${encodeURIComponent(q.ref)}&phone4=${encodeURIComponent(q.secret)}`;
    const res = await apiGet<ComplaintHit | TipHit | Miss>(path);
    if (!res.ok) return setView({ s: "down", q });
    if (!res.data.found) return setView({ s: "none" });
    setView(q.kind === "tip" ? { s: "tip", data: res.data as TipHit } : { s: "complaint", data: res.data as ComplaintHit });
  };

  useEffect(() => {
    const saved = readHandoff<TrackQuery>("track");
    // A reference in the address (from the home page) always asks for the phone digits.
    if (REFERENCE_PATTERNS.complaint.test(refParam)) { setView({ s: "ask", ref: refParam }); return; }
    if (saved) { void run(saved); return; }
    setView({ s: "none" });
  }, [refParam]);

  const askSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (view.s !== "ask") return;
    const q: TrackQuery = { kind: "complaint", ref: view.ref, secret: String(new FormData(e.currentTarget).get("phone4")).trim() };
    saveHandoff("track", q);
    setView({ s: "loading" });
    void run(q);
  };

  if (view.s === "loading") return <p className="muted" role="status">Looking for your case…</p>;
  if (view.s === "down") return (
    <Alert tone="warn" icon="flag" title="We could not check right now.">
      <p>The service did not answer. Try again in a moment.</p>
      <p><button className="btn btn--sm" type="button" onClick={() => { setView({ s: "loading" }); void run(view.q); }}>Try again</button></p>
    </Alert>
  );
  if (view.s === "ask") return (
    <form className="find-card" onSubmit={askSubmit}>
      <h2>Check {view.ref}</h2>
      <TextField id="ask-phone" name="phone4" label="Last 4 digits of the phone you gave" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
        style={{ maxWidth: 180 }} hint="So that only you can see the status." invalid="Write the last 4 digits." />
      <button className="btn" type="submit"><Icon name="search" /> Check the status</button>
    </form>
  );
  if (view.s === "none") return (
    <div className="stack">
      <Alert tone="warn" icon="search" title="We could not find a case with those details.">
        <p>Check the number and the digits or code, and try again. If you lost your number, sign in to see your cases, or call the free line.</p>
      </Alert>
      <p><Link className="btn" href="/track">Try again</Link></p>
    </div>
  );
  if (view.s === "tip") {
    const t = view.data;
    return (
      <article className="result">
        <header className="result__head">
          <div><span className="kicker">Tip</span><h2>{t.reference}</h2></div>
          <StatusPill tone={t.status.startsWith("closed") ? "grey" : "info"}>{t.label}</StatusPill>
        </header>
        <p className="result__lead">{TIP_MEANING[t.status] ?? TIP_MEANING.received}</p>
        <dl className="facts">
          <div><dt>Received</dt><dd>{niceDate(t.receivedAt)}</dd></div>
          <div><dt>Reviewed by</dt><dd>{t.reviewedBy}</dd></div>
        </dl>
      </article>
    );
  }
  const c = view.data;
  const st = statusOf(c.status);
  const stage = c.handledBy?.level ?? st.stage;
  const current = st.stage === "resolved" ? STAGE_INDEX.resolved : STAGE_INDEX[stage as keyof typeof STAGE_INDEX];
  return (
    <article className="result">
      <header className="result__head">
        <div><span className="kicker">Complaint</span><h2>{c.reference}</h2><p className="result__title">{c.title}</p></div>
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
      </header>
      <ProgressTrack stages={STAGES} current={current} resolved={st.stage === "resolved" && st.tone === "ok"} />
      {c.lastNote && <div className="result__note"><Icon name="bell" /><div><b>Latest update</b><p>{c.lastNote}</p></div></div>}
      <dl className="facts">
        <div><dt>Handled by</dt><dd>{c.handledBy ? `${c.handledBy.name}` : "The business"}</dd></div>
        <div><dt>The business</dt><dd>{c.business}</dd></div>
        <div><dt>Problem</dt><dd>{c.category.nameEn}</dd></div>
        <div><dt>Sent on</dt><dd>{niceDate(c.createdAt)}</dd></div>
        <div><dt>Last update</dt><dd>{niceDate(c.updatedAt, true)}</dd></div>
        <div><dt>Official status</dt><dd>{st.official}</dd></div>
      </dl>
      <div className="result__cta"><Icon name="shield" /><div><strong>Messages and documents are only shown after you sign in.</strong>
        <p><Link href={`/sign-in?next=/cases/${c.reference}`}>Sign in to see the full case</Link></p></div></div>
    </article>
  );
}

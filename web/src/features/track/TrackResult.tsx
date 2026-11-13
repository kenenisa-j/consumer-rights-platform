"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { REFERENCE_PATTERNS } from "@consumer-rights/contracts";
import { readHandoff, saveHandoff } from "@/lib/handoff";
import { trackComplaint, trackTip, type TrackComplaint } from "@/mocks/misc";
import { STAGES } from "@/content/common";
import { Alert, KeyValue, ProgressTrack, StatusPill } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { TrackQuery } from "./TrackForms";

type View =
  | { s: "loading" } | { s: "ask"; ref: string } | { s: "none" }
  | { s: "complaint"; data: Extract<TrackComplaint, { found: true }> }
  | { s: "tip"; data: NonNullable<Awaited<ReturnType<typeof trackTip>>> };

export function TrackResult() {
  const refParam = useSearchParams().get("ref")?.toUpperCase() ?? "";
  const [view, setView] = useState<View>({ s: "loading" });

  const run = async (q: TrackQuery) => {
    // One message for "no such number" and "wrong digits": it must not reveal which numbers exist.
    if (q.kind === "tip") {
      const t = await trackTip(q.ref, q.secret);
      return setView(t ? { s: "tip", data: t } : { s: "none" });
    }
    const c = await trackComplaint(q.ref, q.secret);
    setView(c.found ? { s: "complaint", data: c } : { s: "none" });
  };

  useEffect(() => {
    const saved = readHandoff<TrackQuery>("track");
    // A reference in the address (from the home page) always asks for the phone digits; the lookup kept in this
    // tab is only used when the track form sent us here without one.
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
  if (view.s === "ask") return (
    <form className="card form-card" onSubmit={askSubmit}>
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
  if (view.s === "tip") return (
    <div className="card form-card">
      <div className="card-head"><div><span className="kicker">Tip</span><h2 className="mb-0">{view.data.reference}</h2></div><StatusPill>{view.data.label}</StatusPill></div>
      <KeyValue rows={[["Received", view.data.received], ["Reviewed by", view.data.reviewedBy], ["What this means", view.data.meaning]]} />
      <p className="small muted mt-4 mb-0">Tips do not show the findings, so that people who report stay safe.</p>
    </div>
  );
  const c = view.data;
  return (
    <div className="card form-card">
      <div className="card-head"><div><span className="kicker">Complaint</span><h2 className="mb-0">{c.reference}</h2></div><StatusPill>{c.label}</StatusPill></div>
      <ProgressTrack stages={STAGES} current={c.stage} />
      <div className="mt-5"><KeyValue rows={[["Handled by", c.handledBy], ["Last update", c.updated], ["Next step", c.next], ["Official status", c.official]]} /></div>
      <div className="alert mt-5 mb-0"><Icon name="bell" /><div><strong>Messages and documents are only shown after you sign in.</strong>
        <p><Link href={`/sign-in?next=/cases/${c.reference}`}>Sign in to see the full case</Link></p></div></div>
    </div>
  );
}

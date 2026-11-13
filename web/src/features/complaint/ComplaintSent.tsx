"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readHandoff } from "@/lib/handoff";
import { Alert, StatusPill, Timeline } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";

interface Receipt { reference: string; sentAt: string; first: string; email: string; toBusiness: boolean; business: string }

export function ComplaintSent({ freeCall }: { freeCall: string }) {
  const [r, setR] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => setR(readHandoff<Receipt>("complaint-receipt")), []);

  if (r === undefined) return <p className="muted" role="status">Loading…</p>;
  if (!r) return (
    <Alert tone="warn" title="We cannot show a receipt here.">
      This page only shows a complaint right after it is sent. You can find all your complaints in My cases.
      <p><Link className="btn btn--sm" href="/my-cases">Go to my cases</Link></p>
    </Alert>
  );
  const target = r.toBusiness ? "the business" : "the Woreda trade office";
  return (
    <div className="stack">
      <Alert tone="ok" icon="shield" role="status" title={`Your complaint was sent to ${target}.`}>
        {r.email ? `We also sent this to ${r.email}.` : "Keep the number below."}
      </Alert>
      <div className="card form-card center">
        <h1>Thank you, {r.first}<Am text="እናመሰግናለን" /></h1>
        <p>Your complaint number is</p>
        <p><span className="ref">{r.reference}</span></p>
        <p><StatusPill>{r.toBusiness ? "Sent to the business" : "Sent to the Woreda"}</StatusPill> <span className="small muted">Official status: Submitted</span></p>
        <p className="muted">Keep this number. You can use it to <Link href="/track">track the case</Link> even without signing in.</p>
      </div>
      <div className="card"><h2>What happens next<Am text="ቀጥሎ ምን ይሆናል" /></h2>
        <Timeline items={[
          { title: "Received", when: r.sentAt, state: "done" },
          ...(r.toBusiness ? [{ title: "The business replies", text: "You and the business can agree an offer. You get a message when it replies.", state: "todo" as const },
            { title: "If you cannot agree, move it to the Woreda", text: "Your Woreda trade office investigates and helps you settle. If it is not resolved, it moves to the Sub-City, then the City Bureau.", state: "todo" as const }]
            : [{ title: "The Woreda office reviews it", text: "An officer checks your complaint and may ask for more information. If it is not resolved, it moves to the Sub-City, then the City Bureau.", state: "todo" as const }]),
          { title: "An outcome", text: "A refund, a replacement or a repair.", state: "todo" }]} /></div>
      <div className="call-box"><div><b>Questions about your complaint? Call free.</b><a className="call-box__num" href={`tel:${freeCall}`}>Call {freeCall}</a></div></div>
      <div className="btn-row">
        <Link className="btn" href={`/cases/${r.reference}`}>Open my case</Link>
        <Link className="btn btn--secondary" href="/my-cases">Go to my cases</Link>
        <Link className="btn btn--secondary" href="/complaint/new">Make another complaint</Link>
        <button className="btn btn--ghost" type="button" onClick={() => window.print()}>Print this page</button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readHandoff } from "@/lib/handoff";
import { Alert, Timeline } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { niceDate } from "@/lib/case-status";

interface Receipt {
  reference: string; sentAt: string; first: string; email: string; toBusiness: boolean; handledBy: string;
  phone4?: string; failedFiles?: string[]; fileCount?: number;
}

/**
 * The receipt shown in a dialog right after a complaint is sent. The number is large and can be copied, all the details can be copied as one
 * text, it says where the number is kept for later (My cases and the notification bell), and "Print" prints only this card.
 */
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
  const target = r.toBusiness ? "the business" : r.handledBy;
  const when = niceDate(r.sentAt, true);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const summary = [
    `Complaint number: ${r.reference}`, `Sent to: ${target}`, `Sent on: ${when}`,
    `To check it without signing in: open ${origin}/track and write the number${r.phone4 ? ` and the last 4 digits of your phone (${r.phone4})` : " and the last 4 digits of your phone"}.`,
    `Free call line: ${freeCall}`
  ].join("\n");

  return (
    <div className="receipt print-area">
      <div className="receipt__hero">
        <span className="receipt__check" aria-hidden="true"><Icon name="check" /></span>
        <h1>Thank you{r.first ? `, ${r.first}` : ""}<Am text="እናመሰግናለን" /></h1>
        <p role="status">Your complaint was sent to <b>{target}</b>.</p>
      </div>

      {r.failedFiles && r.failedFiles.length > 0 && (
        <Alert tone="warn" icon="flag" title={`${r.failedFiles.length} of ${r.fileCount} files were not uploaded`}>
          Your complaint was sent. Add these files again from your case: {r.failedFiles.join(", ")}. <Link href={`/cases/${r.reference}`}>Open my case</Link>
        </Alert>
      )}

      <div className="receipt__number">
        <span className="kicker">Your complaint number</span>
        <b className="receipt__ref" data-notranslate>{r.reference}</b>
        <div className="btn-row no-print">
          <CopyButton text={r.reference} className="btn btn--sm">Copy the number</CopyButton>
          <CopyButton text={summary} className="btn btn--secondary btn--sm">Copy all details</CopyButton>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => window.print()}>Print this page</button>
        </div>
      </div>

      <dl className="receipt__facts">
        <div><dt>Sent to</dt><dd>{target}</dd></div>
        <div><dt>Sent on</dt><dd>{when}</dd></div>
        <div><dt>Status</dt><dd>{r.toBusiness ? "Sent to the business" : "Received by the office"}</dd></div>
        {r.email && <div><dt>Copy sent to</dt><dd>{r.email}</dd></div>}
      </dl>

      <div className="receipt__keep">
        <Icon name="bell" />
        <div>
          <b>How to find this number later</b>
          <ul>
            <li>It is saved in your <Link href="/notifications">notifications</Link> (the bell at the top) and in <Link href="/my-cases">My cases</Link>.</li>
            <li>Without signing in: <Link href="/track">Track a case</Link>, the number and the last 4 digits of your phone{r.phone4 ? ` (${r.phone4})` : ""}.</li>
          </ul>
        </div>
      </div>

      <div className="receipt__next">
        <h2>What happens next<Am text="ቀጥሎ ምን ይሆናል" /></h2>
        <Timeline items={[
          { title: "Received", when, state: "done" },
          ...(r.toBusiness ? [{ title: "The business replies", text: "You and the business can agree an offer. You get a notice when it replies.", state: "todo" as const },
            { title: "If you cannot agree", text: "An office steps in. It can move the complaint up if it is not resolved.", state: "todo" as const }]
            : [{ title: "The office reviews it", text: "An officer checks your complaint and may ask for more information.", state: "todo" as const }]),
          { title: "An outcome", text: "A refund, a replacement or a repair.", state: "todo" }]} />
      </div>

      <div className="call-box no-print"><div><b>Questions about your complaint? Call free.</b><a className="call-box__num" href={`tel:${freeCall}`}>Call {freeCall}</a></div></div>
      <div className="btn-row no-print">
        <Link className="btn" href={`/cases/${r.reference}`}>Open my case</Link>
        <Link className="btn btn--secondary" href="/my-cases">Go to my cases</Link>
        <Link className="btn btn--ghost" href="/complaint/new">Make another complaint</Link>
      </div>
    </div>
  );
}

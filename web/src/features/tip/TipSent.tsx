"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readHandoff } from "@/lib/handoff";
import { Alert, Timeline } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { niceDate } from "@/lib/case-status";

interface Receipt { reference: string; code: string; receivedAt: string; anonymous: boolean }

/** The tip receipt: the number and the private code, both copyable, and a print that prints only this card. The code is shown once. */
export function TipSent() {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => setReceipt(readHandoff<Receipt>("tip-receipt")), []);

  if (receipt === undefined) return <p className="muted">Loading…</p>;
  if (!receipt) return (
    <Alert tone="warn" title="We cannot show your tip number here.">
      This page only shows a tip right after it is sent. If you just sent one, your number and private code were shown on the previous screen.
      <p><Link href="/tip">Send a tip</Link> · <Link href="/track?kind=tip">Check a tip</Link></p>
    </Alert>
  );
  const when = niceDate(receipt.receivedAt, true);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const summary = `Tip number: ${receipt.reference}\nPrivate code: ${receipt.code}\nTo check it: open ${origin}/track?kind=tip and write both.`;

  return (
    <div className="receipt print-area">
      <div className="receipt__hero">
        <span className="receipt__check" aria-hidden="true"><Icon name="check" /></span>
        <h1>Tip received<Am text="ጥቆማዎ ደርሷል" /></h1>
        <p role="status">Thank you. An officer of the Addis Ababa Trade and Market Bureau will review it.</p>
      </div>

      <div className="receipt__number">
        <span className="kicker">Your tip number</span>
        <b className="receipt__ref" data-notranslate>{receipt.reference}</b>
        {receipt.anonymous && (
          <>
            <span className="kicker mt-4">Your private code</span>
            <b className="receipt__ref receipt__ref--code" data-notranslate>{receipt.code}</b>
          </>
        )}
        <div className="btn-row no-print">
          {receipt.anonymous && <CopyButton text={receipt.code} className="btn btn--sm">Copy the code</CopyButton>}
          <CopyButton text={receipt.anonymous ? summary : receipt.reference} className="btn btn--secondary btn--sm">{receipt.anonymous ? "Copy both" : "Copy the number"}</CopyButton>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => window.print()}>Print this page</button>
        </div>
      </div>

      {receipt.anonymous ? (
        <div className="receipt__keep receipt__keep--warn">
          <Icon name="shield" />
          <div><b>Keep the code safe. It is shown only once.</b>
            <p className="mb-0">We did not keep your name or phone number, so this code is the only way to check your tip. Copy it, write it down or print this page.</p></div>
        </div>
      ) : <p className="muted">You shared your contact details, so an officer may call you if they need to ask something.</p>}

      <div className="receipt__next">
        <h2>What happens to a tip<Am text="ጥቆማው ምን ይሆናል" /></h2>
        <Timeline items={[
          { title: "Received", when, state: "done" },
          { title: "Under review", text: "An officer reads it and decides whether to follow it up.", state: "todo" },
          { title: "Follow-up", text: "For example a visit to the market. Serious findings can become an official case.", state: "todo" },
          { title: "Closed", text: "With action taken, or with no action needed.", state: "todo" }]} />
      </div>
      <div className="btn-row no-print"><Link className="btn" href="/track?kind=tip">Check a tip</Link><Link className="btn btn--secondary" href="/">Back to home</Link></div>
    </div>
  );
}

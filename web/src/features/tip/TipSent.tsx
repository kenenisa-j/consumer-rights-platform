"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readHandoff } from "@/lib/handoff";
import { Alert, Timeline } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";

interface Receipt { reference: string; code: string; receivedAt: string; anonymous: boolean }

export function TipSent() {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => setReceipt(readHandoff<Receipt>("tip-receipt")), []);

  if (receipt === undefined) return <p className="muted">Loading…</p>;
  if (!receipt) return (
    <Alert tone="warn" title="We cannot show your tip number here.">
      This page only shows a tip right after it is sent. If you just sent one, your number and private code were shown on the previous screen.
      <p><Link href="/tip">Send a tip</Link> · <Link href="/track?kind=tip">Check a tip</Link></p>
    </Alert>
  );
  const copy = async () => { try { await navigator.clipboard.writeText(receipt.code); setCopied(true); } catch { /* user can select the text */ } };

  return (
    <div className="stack">
      <Alert tone="ok" icon="shield" role="status" title="Thank you. Your tip was received.">An officer of the Addis Ababa Trade and Market Bureau will review it.</Alert>
      <div className="card form-card center">
        <h1>Tip received<Am text="ጥቆማዎ ደርሷል" /></h1>
        <p>Tip number</p><p><span className="ref">{receipt.reference}</span></p>
        {receipt.anonymous ? (
          <>
            <p>Your private code</p><p><span className="ref">{receipt.code}</span></p>
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <button className="btn btn--secondary btn--sm" type="button" onClick={copy}>{copied ? "Copied" : "Copy the code"}</button>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => window.print()}>Print this page</button>
            </div>
            <p className="muted mt-4">We did not keep your name or phone number, so this code is the only way to check your tip. Write it down or take a photo of this page. It is not shown again.</p>
          </>
        ) : <p className="muted">You shared your contact details, so an officer may call you if they need to ask something.</p>}
      </div>
      <div className="card"><h2>What happens to a tip<Am text="ጥቆማው ምን ይሆናል" /></h2>
        <Timeline items={[
          { title: "Received", when: receipt.receivedAt, state: "done" },
          { title: "Under review", text: "An officer reads it and decides whether to follow it up.", state: "todo" },
          { title: "Follow-up", text: "For example a visit to the market. Serious findings can become an official case.", state: "todo" },
          { title: "Closed", text: "With action taken, or with no action needed.", state: "todo" }]} /></div>
      <div className="btn-row"><Link className="btn" href="/track?kind=tip">Check a tip</Link><Link className="btn btn--secondary" href="/">Back to home</Link></div>
    </div>
  );
}

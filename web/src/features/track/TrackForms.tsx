"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveHandoff } from "@/lib/handoff";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

export type TrackQuery = { kind: "complaint"; ref: string; secret: string } | { kind: "tip"; ref: string; secret: string };

/** Tabs for a complaint (reference + last 4 phone digits) or a tip (reference + private code). */
export function TrackForms() {
  const router = useRouter();
  const [kind, setKind] = useState<"complaint" | "tip">(useSearchParams().get("kind") === "tip" ? "tip" : "complaint");

  const go = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const query: TrackQuery = kind === "complaint"
      ? { kind, ref: String(d.get("ref")).trim().toUpperCase(), secret: String(d.get("phone4")).trim() }
      : { kind, ref: String(d.get("tip")).trim().toUpperCase(), secret: String(d.get("code")).trim().toUpperCase() };
    saveHandoff("track", query);
    router.push("/track/result");
  };

  return (
    <div className="card form-card">
      <div className="tab-bar" role="tablist" aria-label="What do you want to check?">
        {(["complaint", "tip"] as const).map(k => (
          <button key={k} role="tab" type="button" aria-selected={kind === k} id={`tab-${k}`} aria-controls="track-panel"
            onClick={() => setKind(k)} style={{ border: 0, background: "none", font: "inherit", cursor: "pointer", padding: "var(--s3) var(--s4)", fontWeight: 700, whiteSpace: "nowrap",
              color: kind === k ? "var(--green)" : "var(--muted)", borderBottom: `3px solid ${kind === k ? "var(--orange)" : "transparent"}` }}>
            {k === "complaint" ? <>A complaint <span className="am-inline" lang="am">ቅሬታ</span></> : <>A tip <span className="am-inline" lang="am">ጥቆማ</span></>}
          </button>
        ))}
      </div>
      <form id="track-panel" role="tabpanel" aria-labelledby={`tab-${kind}`} onSubmit={go} key={kind}>
        {kind === "complaint" ? (
          <>
            <TextField id="tr-ref" name="ref" label="Complaint number" required pattern="CC-[0-9]{4}-[0-9]{5}" placeholder="CC-2026-00123"
              autoComplete="off" invalid="Write the number as given, for example CC-2026-00123." />
            <TextField id="tr-phone" name="phone4" label="Last 4 digits of the phone you gave" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
              style={{ maxWidth: 180 }} hint="So that only you can see the status." invalid="Write the last 4 digits." />
          </>
        ) : (
          <>
            <TextField id="tr-tip" name="tip" label="Tip number" required pattern="TIP-[0-9]{4}-[0-9]{5}" placeholder="TIP-2026-00045" autoComplete="off"
              invalid="Write the number as given, for example TIP-2026-00045." />
            <TextField id="tr-code" name="code" label="Private code" required pattern="[A-Za-z0-9]{4}-[A-Za-z0-9]{4}" placeholder="Q7MD-42KX" autoComplete="off"
              style={{ maxWidth: 240 }} invalid="Write the 8-character code, for example Q7MD-42KX." />
          </>
        )}
        <button className="btn" type="submit"><Icon name="search" /> {kind === "complaint" ? "Check the status" : "Check the tip"}</button>
      </form>
      <p className="small muted mt-4 mb-0">Demo data: complaint CC-2026-00123 with 0412, or tip TIP-2026-00045 with Q7MD-42KX.</p>
      <p className="small muted mt-4 mb-0">Lost your number? Signed-in users see all their complaints in <Link href="/my-cases">My cases</Link>.</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { asPhone, registerConsumer, sendOtp } from "@/lib/auth-client";
import { Alert } from "@/components/ui/Display";
import { CheckField, TextField } from "@/components/ui/Field";

// Ethiopian mobile numbers: 09xx / 07xx, or +251 9xx / 7xx, with optional spaces.
const PHONE = String.raw`(\+251 ?|0)[79]( ?[0-9]){8}`;

interface Details { fullName: string; phone: string; password: string }

/**
 * Two steps against the real API: details, then the 6-digit code sent to the phone. The account is created (and the
 * person signed in) only when the code is right. The API stores a name, a verified phone and a password for now;
 * Sub-City and Woreda are asked in the complaint form, where they decide which office gets the case.
 */
export function RegisterForm({ devHint = false }: { devHint?: boolean }) {
  const [step, setStep] = useState<"details" | "code">("details");
  const [details, setDetails] = useState<Details | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const phoneOf = (d: Details) => asPhone(d.phone) as string;

  const askForCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("password2")) { setMismatch("The two passwords are not the same."); return; }
    setMismatch(null); setError(null); setBusy(true);
    const next = { fullName: String(f.get("name")).trim(), phone: String(f.get("phone")), password: String(f.get("password")) };
    const sent = await sendOtp(phoneOf(next));
    setBusy(false);
    if (!sent.ok) { setError(sent.error); return; }
    setDetails(next); setStep("code");
  };

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!details) return;
    setError(null); setBusy(true);
    const otp = String(new FormData(e.currentTarget).get("otp")).trim();
    const made = await registerConsumer({ phoneNumber: phoneOf(details), otp, fullName: details.fullName, password: details.password, preferredLanguage: "en" });
    if (!made.ok) { setError(made.error); setBusy(false); return; }
    window.location.assign("/verify"); // signed in by the API; a full load so the header shows the account
  };

  const resend = async () => {
    if (!details) return;
    setError(null); setBusy(true);
    const sent = await sendOtp(phoneOf(details));
    setBusy(false);
    setError(sent.ok ? null : sent.error);
  };

  if (step === "code" && details) {
    return (
      <form className="card form-card" onSubmit={create}>
        <p>We sent a 6-digit code to <b>{details.phone}</b>. It works for 5 minutes.</p>
        {devHint && <Alert tone="info" icon="bell" title="Development">No SMS is sent yet. Run <code>npm run dev:otp -- {details.phone.replace(/\s/g, "")}</code> in the terminal to read the code.</Alert>}
        {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title="Not yet.">{error}</Alert></div>}
        <TextField id="r-otp" name="otp" label="Code from the SMS" am="ኮድ" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
          autoComplete="one-time-code" style={{ maxWidth: 200, letterSpacing: ".3em" }} invalid="Write the 6 digits." />
        <div className="form-foot">
          <button className="btn btn--secondary" type="button" onClick={() => { setStep("details"); setError(null); }}>Change the number</button>
          <span className="btn-row">
            <button className="btn btn--ghost" type="button" onClick={resend} disabled={busy}>Send a new code</button>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Creating…" : "Create the account"}</button>
          </span>
        </div>
      </form>
    );
  }

  return (
    <form className="card form-card" onSubmit={askForCode}>
      {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title="Not yet.">{error}</Alert></div>}
      <div className="form-grid">
        <TextField id="r-name" name="name" label="Full name" am="ሙሉ ስም" full required minLength={3} maxLength={100}
          autoComplete="name" defaultValue={details?.fullName} invalid="Write your full name." />
        <TextField id="r-phone" name="phone" label="Phone number" am="ስልክ" type="tel" required pattern={PHONE} inputMode="tel" full
          placeholder="09xx xxx xxx" autoComplete="tel" defaultValue={details?.phone} hint="We send a code to this number to confirm it is yours."
          invalid="Write a mobile number such as 0911 234 567." />
        <TextField id="r-pw" name="password" label="Password" type="password" required minLength={8} autoComplete="new-password"
          hint="At least 8 characters." invalid="Use at least 8 characters." />
        <TextField id="r-pw2" name="password2" label="Password again" type="password" required autoComplete="new-password" error={mismatch}
          onChange={() => mismatch && setMismatch(null)} />
        <div className="full">
          <CheckField name="consent" required>I agree that the consumer protection office keeps my details to handle my complaints. My details are not shown to the businesses I complain about.{" "}
            <Link href="/help#privacy">How my data is used</Link></CheckField>
        </div>
      </div>
      <div className="form-foot">
        <Link className="btn btn--secondary" href="/sign-in">I already have an account</Link>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Sending the code…" : "Send me a code"}</button>
      </div>
    </form>
  );
}

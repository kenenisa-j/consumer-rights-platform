"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SUB_CITIES } from "@/content/common";
import { CheckField, SelectField, TextField } from "@/components/ui/Field";

// Ethiopian mobile numbers: 09xx / 07xx, or +251 9xx / 7xx, with optional spaces.
const PHONE = String.raw`(\+251 ?|0)[79]( ?[0-9]){8}`;

export function RegisterForm() {
  const router = useRouter();
  const [mismatch, setMismatch] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (d.get("password") !== d.get("password2")) { setMismatch("The two passwords are not the same."); return; }
    setMismatch(null);
    router.push("/verify"); // The backend will create the account here (consent version recorded).
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="form-grid">
        <TextField id="r-name" name="name" label="Full name" am="ሙሉ ስም" full required minLength={3} maxLength={100}
          autoComplete="name" invalid="Write your full name." />
        <TextField id="r-phone" name="phone" label="Phone number" am="ስልክ" type="tel" required pattern={PHONE} inputMode="tel"
          placeholder="09xx xxx xxx" autoComplete="tel" invalid="Write a mobile number such as 0911 234 567." />
        <TextField id="r-email" name="email" label="Email" optional type="email" autoComplete="email" hint="For updates by email." />
        <SelectField id="r-sub" name="subcity" label="Sub-City where you live" required options={SUB_CITIES} placeholder="Choose a Sub-City"
          invalid="Choose your Sub-City." />
        <TextField id="r-wo" name="woreda" label="Woreda number" type="number" min={1} max={30} inputMode="numeric" required invalid="Write your Woreda number." />
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
        <button className="btn" type="submit">Create the account</button>
      </div>
    </form>
  );
}

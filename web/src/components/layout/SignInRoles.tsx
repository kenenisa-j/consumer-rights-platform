"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SIGN_IN_ROLES } from "@/content/shell";
import { Am } from "@/components/ui/Bi";

const DEMO_CREDENTIALS: Record<string, { id: string; pw: string }> = {
  consumer: { id: "+251911000001", pw: "demo12345678" },
  business: { id: "+251911223344", pw: "demo12345678" },
  woreda: { id: "+251911000002", pw: "demo12345678" },
  subcity: { id: "+251911000003", pw: "demo12345678" },
  bureau: { id: "+251911000004", pw: "demo12345678" },
};

/** Only same-site paths are accepted as a return address. */
export function safeNext(value: string | undefined | null): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export function SignInRoles({ idPrefix, next }: { idPrefix: string; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>, roleKey: string, landing: string) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const phoneNumber = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/sign-in/phone-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Sign in failed (${res.status})`);
      }

      const dest = roleKey === "consumer" ? (next ?? landing) : landing;
      window.location.href = dest;
    } catch (err: any) {
      setError(err.message || "Sign in failed. Check your phone number and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="roles">
      {SIGN_IN_ROLES.map(r => (
        <input key={r.key} className="role-radio" type="radio" name={`${idPrefix}-role`} id={`${idPrefix}-r-${r.key}`}
          data-role={r.key} defaultChecked={r.key === "consumer"} />
      ))}
      <div className="role-bar" aria-label="Sign in as">
        {SIGN_IN_ROLES.map(r => <label key={r.key} htmlFor={`${idPrefix}-r-${r.key}`}>{r.tab}</label>)}
      </div>
      {error && <p className="small" style={{ color: "var(--bad)", margin: "var(--s2) 0" }}>{error}</p>}
      {SIGN_IN_ROLES.map(r => {
        const demo = DEMO_CREDENTIALS[r.key];
        return (
          <div key={r.key} className={`role-panel p-${r.key}`}>
            <p className="small muted">{r.hint}</p>
            <form onSubmit={(e) => handleSubmit(e, r.key, r.landing)}>
              <div className="field">
                <label htmlFor={`${idPrefix}-${r.key}-id`}>{r.idLabel}</label>
                <input className="input" id={`${idPrefix}-${r.key}-id`} name="phone"
                  autoComplete="username" defaultValue={demo?.id} required />
              </div>
              <div className="field">
                <label htmlFor={`${idPrefix}-${r.key}-pw`}>Password</label>
                <input className="input" id={`${idPrefix}-${r.key}-pw`} name="password"
                  type="password" autoComplete="current-password" defaultValue={demo?.pw} required />
              </div>
              <button className="btn btn--block btn--stack" type="submit" disabled={loading}>
                <span>{loading ? "Signing in…" : r.button}</span>
                <Am text={r.am} />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

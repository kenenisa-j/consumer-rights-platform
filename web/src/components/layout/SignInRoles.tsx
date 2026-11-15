"use client";

import { useState, type FormEvent } from "react";
import type { PortalKey } from "@consumer-rights/contracts";
import { SIGN_IN_ROLES } from "@/content/shell";
import { signIn } from "@/lib/auth-client";
import { LANDING_PATHS } from "@/lib/landing";
import { Am } from "@/components/ui/Bi";
import type { UiTestAccount } from "@/lib/test-accounts";
export { safeNext } from "@/lib/safe-next";

// The five sign-ins. Radio + :checked CSS (public.css) switches the panels. The fields have no `name`, so nothing
// typed (above all the password) is ever put in the address or the browser history; the form posts with JavaScript.
export function SignInRoles({ idPrefix, next, testAccounts = [], initialRole = "consumer" }: {
  idPrefix: string; next?: string; testAccounts?: readonly UiTestAccount[]; initialRole?: string;
}) {
  return (
    <div className="roles">
      {SIGN_IN_ROLES.map(r => (
        <input key={r.key} className="role-radio" type="radio" name={`${idPrefix}-role`} id={`${idPrefix}-r-${r.key}`}
          data-role={r.key} defaultChecked={r.key === initialRole} />
      ))}
      <div className="role-bar" aria-label="Sign in as">
        {SIGN_IN_ROLES.map(r => <label key={r.key} htmlFor={`${idPrefix}-r-${r.key}`}>{r.tab}</label>)}
      </div>
      {SIGN_IN_ROLES.map(r => (
        <RolePanel key={r.key} role={r} idPrefix={idPrefix} next={next} accounts={testAccounts.filter(a => a.portal === r.key)} />
      ))}
    </div>
  );
}

function RolePanel({ role, idPrefix, next, accounts }: {
  role: (typeof SIGN_IN_ROLES)[number]; idPrefix: string; next?: string; accounts: readonly UiTestAccount[];
}) {
  const key = role.key as PortalKey;
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fill = (accountKey: string) => {
    setPick(accountKey);
    const a = accounts.find(x => x.key === accountKey);
    if (a) { setId(a.identifier); setPw(a.password); setError(null); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const result = await signIn(id, pw, key);
    if (!result.ok) { setError(result.error); setBusy(false); return; }
    window.location.assign(key === "consumer" ? (next ?? LANDING_PATHS.consumer) : LANDING_PATHS[key]);
  };

  return (
    <div className={`role-panel p-${role.key}`}>
      <p className="small muted">{role.hint}</p>
      <form onSubmit={submit} method="post" noValidate={false}>
        {accounts.length > 0 && (
          <div className="field test-account">
            <label htmlFor={`${idPrefix}-${role.key}-test`}>Test account <span className="badge badge--proposed">Development only</span></label>
            <select className="select" id={`${idPrefix}-${role.key}-test`} value={pick} onChange={e => fill(e.target.value)}>
              <option value="">Choose one to fill in the form</option>
              {accounts.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor={`${idPrefix}-${role.key}-id`}>{role.idLabel}</label>
          <input className="input" id={`${idPrefix}-${role.key}-id`} autoComplete="username" required value={id}
            onChange={e => { setId(e.target.value); setPick(""); }} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-${role.key}-pw`}>Password</label>
          <input className="input" id={`${idPrefix}-${role.key}-pw`} type="password" autoComplete="current-password" required value={pw}
            onChange={e => { setPw(e.target.value); setPick(""); }} />
        </div>
        {error && <p className="error-text show" role="alert">{error}</p>}
        <button className="btn btn--block btn--stack" type="submit" disabled={busy}>
          <span>{busy ? "Signing in…" : role.button}</span><Am text={role.am} />
        </button>
      </form>
    </div>
  );
}

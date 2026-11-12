import Link from "next/link";
import { SIGN_IN_ROLES } from "@/content/shell";
import { Icon } from "@/components/ui/Icon";
import { Am } from "@/components/ui/Bi";

// Radio + :checked CSS from public.css drives the role tabs, as in the prototype.
// Sign-in submits as GET to each role's landing page until the auth API exists (see work-tracker).
export function SignInModal() {
  return (
    <div className="modal" id="signin" role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <div className="modal__box">
        <a className="modal__close" href="#" aria-label="Close">×</a>
        <span className="icon-bubble"><Icon name="user" /></span>
        <h2 id="signin-title" className="mt-4">Sign in<Am text="ይግቡ" /></h2>
        <p className="muted">Choose how you sign in.</p>
        <div className="roles">
          {SIGN_IN_ROLES.map(r => (
            <input key={r.key} className="role-radio" type="radio" name="md-role" id={`md-r-${r.key}`}
              data-role={r.key} defaultChecked={r.key === "consumer"} />
          ))}
          <div className="role-bar" aria-label="Sign in as">
            {SIGN_IN_ROLES.map(r => <label key={r.key} htmlFor={`md-r-${r.key}`}>{r.tab}</label>)}
          </div>
          {SIGN_IN_ROLES.map(r => (
            <div key={r.key} className={`role-panel p-${r.key}`}>
              <p className="small muted">{r.hint}</p>
              <form action={r.landing} method="get">
                <div className="field">
                  <label htmlFor={`md-${r.key}-id`}>{r.idLabel}</label>
                  <input className="input" id={`md-${r.key}-id`} name="id" autoComplete="username" />
                </div>
                <div className="field">
                  <label htmlFor={`md-${r.key}-pw`}>Password</label>
                  <input className="input" id={`md-${r.key}-pw`} name="password" type="password" autoComplete="current-password" />
                </div>
                <button className="btn btn--block btn--stack" type="submit"><span>{r.button}</span><Am text={r.am} /></button>
              </form>
            </div>
          ))}
        </div>
        <p className="small mt-4 mb-0"><Link href="/help#account">Forgot your password?</Link> · New here? <Link href="/register">Create an account</Link></p>
      </div>
    </div>
  );
}

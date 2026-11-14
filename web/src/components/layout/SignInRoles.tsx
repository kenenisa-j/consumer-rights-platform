import { SIGN_IN_ROLES } from "@/content/shell";
import { Am } from "@/components/ui/Bi";

/** Only same-site paths are accepted as a return address, so a link cannot send people to another site. */
export function safeNext(value: string | undefined | null): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

const DEMO_CREDENTIALS: Record<string, { id: string; pw: string }> = {
  consumer: { id: "0911 00 00 01", pw: "demo1234" },
  business: { id: "0911 22 33 44", pw: "demo1234" },
  woreda: { id: "meron.tadesse@addisababa.gov.et", pw: "demo1234" },
  subcity: { id: "subcity.officer@addisababa.gov.et", pw: "demo1234" },
  bureau: { id: "bureau.officer@addisababa.gov.et", pw: "demo1234" }
};

// The five sign-ins. Radio + :checked CSS (public.css) switches the panels without JavaScript.
// Until the authentication API exists, the form only navigates to each role's landing page. The fields have no
// `name`, so nothing typed (above all the password) is ever put in the address or the browser history.
export function SignInRoles({ idPrefix, next }: { idPrefix: string; next?: string }) {
  return (
    <div className="roles">
      {SIGN_IN_ROLES.map(r => (
        <input key={r.key} className="role-radio" type="radio" name={`${idPrefix}-role`} id={`${idPrefix}-r-${r.key}`}
          data-role={r.key} defaultChecked={r.key === "consumer"} />
      ))}
      <div className="role-bar" aria-label="Sign in as">
        {SIGN_IN_ROLES.map(r => <label key={r.key} htmlFor={`${idPrefix}-r-${r.key}`}>{r.tab}</label>)}
      </div>
      {SIGN_IN_ROLES.map(r => {
        const demo = DEMO_CREDENTIALS[r.key];
        return (
          <div key={r.key} className={`role-panel p-${r.key}`}>
            <p className="small muted">{r.hint}</p>
            <form action={r.key === "consumer" ? (next ?? r.landing) : r.landing} method="get">
              <div className="field">
                <label htmlFor={`${idPrefix}-${r.key}-id`}>{r.idLabel}</label>
                <input
                  className="input"
                  id={`${idPrefix}-${r.key}-id`}
                  autoComplete="username"
                  defaultValue={demo?.id}
                />
              </div>
              <div className="field">
                <label htmlFor={`${idPrefix}-${r.key}-pw`}>Password</label>
                <input
                  className="input"
                  id={`${idPrefix}-${r.key}-pw`}
                  type="password"
                  autoComplete="current-password"
                  defaultValue={demo?.pw}
                />
              </div>
              <button className="btn btn--block btn--stack" type="submit">
                <span>{r.button}</span>
                <Am text={r.am} />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

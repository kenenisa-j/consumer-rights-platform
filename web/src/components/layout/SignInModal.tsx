import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Am } from "@/components/ui/Bi";
import { SignInRoles } from "./SignInRoles";
import { testAccountsForUi } from "@/lib/test-accounts";

export function SignInModal() {
  return (
    <div className="modal" id="signin" role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <div className="modal__box">
        <a className="modal__close" href="#" aria-label="Close">×</a>
        <span className="icon-bubble"><Icon name="user" /></span>
        <h2 id="signin-title" className="mt-4">Sign in<Am text="ይግቡ" /></h2>
        <p className="muted">Choose how you sign in.</p>
        <SignInRoles idPrefix="md" testAccounts={testAccountsForUi()} />
        <p className="small mt-4 mb-0"><Link href="/help#account">Forgot your password?</Link> · New here? <Link href="/register">Create an account</Link></p>
      </div>
    </div>
  );
}

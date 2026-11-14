import Link from "next/link";
import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { SignInRoles } from "@/components/layout/SignInRoles";
import { SIGN_IN_ROLES } from "@/content/shell";
import { safeNext } from "@/lib/safe-next";
import { testAccountsForUi } from "@/lib/test-accounts";

export const metadata = { title: "Sign in" };

// Prototype: public/sign-in.html. `?next=/path` returns the consumer to where they were going.
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const role = SIGN_IN_ROLES.some(r => r.key === query.role) ? query.role : "consumer";
  return (
    <>
      <PageHead crumbs={[{ label: "Sign in" }]} title={bi("Sign in", "ይግቡ")} lead="Choose how you sign in." />
      <section className="section"><div className="container narrow">
        <div className="card form-card">
          <SignInRoles idPrefix="pg" next={next} testAccounts={testAccountsForUi()} initialRole={role} />
          <p className="small mt-4 mb-0"><Link href="/help#account">Forgot your password?</Link></p>
          <p className="small mb-0">New here? <Link href="/register">Create an account</Link></p>
        </div>
      </div></section>
    </>
  );
}

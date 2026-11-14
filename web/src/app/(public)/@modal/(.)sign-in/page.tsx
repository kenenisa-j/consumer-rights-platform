import Link from "next/link";
import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { SignInRoles } from "@/components/layout/SignInRoles";
import { SIGN_IN_ROLES } from "@/content/shell";
import { safeNext } from "@/lib/safe-next";
import { testAccountsForUi } from "@/lib/test-accounts";

export default async function SignInModal({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const role = SIGN_IN_ROLES.some(r => r.key === query.role) ? query.role : "consumer";
  return (
    <RouteModal title="Sign in" size="md">
      <ModalHead title="Sign in" am="ይግቡ" lead="Choose how you sign in." />
      <SignInRoles idPrefix="rm" next={next} testAccounts={testAccountsForUi()} initialRole={role} />
      <p className="small mt-4 mb-0"><Link href="/help#account">Forgot your password?</Link> · New here? <Link href="/register">Create an account</Link></p>
    </RouteModal>
  );
}

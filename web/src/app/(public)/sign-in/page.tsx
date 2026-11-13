import Link from "next/link";
import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { SignInRoles, safeNext } from "@/components/layout/SignInRoles";

export const metadata = { title: "Sign in" };

// Prototype: public/sign-in.html. `?next=/path` returns the consumer to where they were going.
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <>
      <PageHead crumbs={[{ label: "Sign in" }]} title={bi("Sign in", "ይግቡ")} lead="Choose how you sign in." />
      <section className="section"><div className="container narrow">
        <div className="card form-card">
          <SignInRoles idPrefix="pg" next={next} />
          <p className="small mt-4 mb-0"><Link href="/help#account">Forgot your password?</Link></p>
          <p className="small mb-0">New here? <Link href="/register">Create an account</Link></p>
        </div>
        <p className="small muted mt-4">Prototype note: no password is checked yet. Real sign-in arrives with the backend.</p>
      </div></section>
    </>
  );
}

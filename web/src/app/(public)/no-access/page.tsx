import Link from "next/link";
import { PORTALS, type PortalKey } from "@consumer-rights/contracts";
import { bi } from "@/content/types";
import { LANDING, getMe, portalOf } from "@/lib/session";
import { PageHead } from "@/components/ui/PageHead";
import { SignOutButton } from "@/components/layout/SignOutButton";

export const metadata = { title: "No access", robots: { index: false } };

const AREA: Record<PortalKey, string> = { consumer: "consumers", business: "businesses", woreda: "Woreda offices", subcity: "Sub-City offices", bureau: "the City Bureau" };

// Shown when someone is signed in, but to a different portal than the page they asked for.
export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const area = (await searchParams).area;
  const wanted = area && area in PORTALS ? (area as PortalKey) : null;
  const me = await getMe();
  const own = me ? portalOf(me) : null;
  return (
    <>
      <PageHead title={bi("This page is not for your account", "ይህ ገጽ ለእርስዎ መለያ አይደለም")}
        lead={wanted ? `That page is for ${AREA[wanted]}.${own ? ` You are signed in to a ${own} account.` : ""}` : "You are not allowed to open that page."} />
      <section className="section"><div className="container narrow">
        <div className="btn-row">
          {own && <Link className="btn" href={LANDING[own]}>Go to my area</Link>}
          {me ? <SignOutButton className="btn btn--secondary">Sign out and use another account</SignOutButton>
            : <Link className="btn" href="/sign-in">Sign in</Link>}
        </div>
      </div></section>
    </>
  );
}

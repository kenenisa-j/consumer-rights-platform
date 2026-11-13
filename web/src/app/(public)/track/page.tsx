import Link from "next/link";
import { Suspense } from "react";
import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { TrackForms } from "@/features/track/TrackForms";

export const metadata = { title: "Track a case" };

// Prototype: public/track.html. Improved: real tabs, secrets kept out of the address.
export default function TrackPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Track a case" }]} title={bi("Track a case", "ጉዳይዎን ይከታተሉ")}
        lead={<>Check the status without signing in. For messages and documents, <Link href="/sign-in">sign in</Link>.</>} />
      <section className="section"><div className="container narrow">
        <Suspense fallback={<p className="muted">Loading…</p>}><TrackForms /></Suspense>
      </div></section>
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { TrackResult } from "@/features/track/TrackResult";

export const metadata = { title: "Case status" };

// Prototype: public/track-result.html
export default function TrackResultPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Track a case", href: "/track" }, { label: "Status" }]} title={bi("Case status", "የጉዳዩ ሁኔታ")} />
      <section className="section"><div className="container narrow stack">
        <Suspense fallback={<p className="muted">Loading…</p>}><TrackResult /></Suspense>
        <p><Link href="/track">Check another case</Link></p>
      </div></section>
    </>
  );
}

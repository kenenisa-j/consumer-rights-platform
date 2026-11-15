import { Suspense } from "react";
import { bi } from "@/content/types";
import { freeCallNumber } from "@/lib/config";
import { PageHead } from "@/components/ui/PageHead";
import { CallBox } from "@/components/ui/Display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TrackForms } from "@/features/track/TrackForms";
import Link from "next/link";

export const metadata = { title: "Track a case" };

const HELP: { icon: IconName; title: string; text: string }[] = [
  { icon: "file", title: "Your number", text: "A complaint number starts with CC, a tip number with TIP. You got it when you sent it, and by email if you gave one." },
  { icon: "phone", title: "Your check", text: "A complaint needs the last 4 digits of your phone. A tip needs the private code shown once after sending." },
  { icon: "shield", title: "Private by design", text: "Only the status is shown here. Messages, files and names need you to sign in. We never show a tip's findings." }
];

// Prototype: public/track.html. Redesigned: one card to find a case, three short answers beside it, secrets kept out of the address.
export default function TrackPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Track a case" }]} title={bi("Track a case", "ጉዳይዎን ይከታተሉ")}
        lead="See where your complaint or tip is. You do not need to sign in to check the status." />
      <section className="section"><div className="container">
        <div className="track-page">
          <Suspense fallback={<p className="muted">Loading…</p>}><TrackForms /></Suspense>
          <aside className="track-help" aria-label="Where to find your details">
            {HELP.map(h => (
              <div key={h.title} className="track-help__item"><span className="icon-bubble"><Icon name={h.icon} /></span>
                <div><h2>{h.title}</h2><p>{h.text}</p></div></div>
            ))}
            <p className="small">Signed in? <Link href="/my-cases">Open all your cases</Link>.</p>
            <CallBox freeCall={freeCallNumber()} text="Cannot find your number? Call free." />
          </aside>
        </div>
      </div></section>
    </>
  );
}

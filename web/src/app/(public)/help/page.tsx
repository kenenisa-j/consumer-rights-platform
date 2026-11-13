import { Suspense } from "react";
import { bi } from "@/content/types";
import { freeCallNumber } from "@/lib/config";
import { PageHead } from "@/components/ui/PageHead";
import { HelpContent } from "@/features/info/HelpContent";

export const metadata = { title: "Help" };

// Prototype: public/help.html. Improved: searchable questions and an office finder.
export default function HelpPage() {
  const freeCall = freeCallNumber();
  return (
    <>
      <PageHead crumbs={[{ label: "Help" }]} title={bi("Help", "እገዛ")}
        lead={<>Answers to common questions, and where to find an office. Or call free on {freeCall}.</>} />
      <section className="section"><div className="container narrow">
        <Suspense fallback={<p className="muted">Loading…</p>}><HelpContent freeCall={freeCall} /></Suspense>
      </div></section>
    </>
  );
}

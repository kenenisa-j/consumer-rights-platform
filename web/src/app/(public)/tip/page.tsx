import Link from "next/link";
import { bi } from "@/content/types";
import { freeCallNumber } from "@/lib/config";
import { PageHead } from "@/components/ui/PageHead";
import { CallBox } from "@/components/ui/Display";
import { TipForm } from "@/features/tip/TipForm";

export const metadata = { title: "Report unfair trade" };

// Prototype: public/tip.html. Improved: file list with limits, inline errors, retry on failure.
export default function TipPage() {
  const freeCall = freeCallNumber();
  return (
    <>
      <PageHead crumbs={[{ label: "Report unfair trade" }]} title={bi("Report unfair trade in the market", "በገበያ ያዩትን ችግር ይጠቁሙ")}
        lead={`Tell us what you saw. No account is needed and you can stay anonymous. An officer reviews every tip. Prefer to talk? Call free on ${freeCall}.`} />
      <section className="section"><div className="container"><div className="layout">
        <TipForm />
        <aside className="side">
          <div className="card card--tint"><h2 style={{ fontSize: "1.05rem" }}>Tips are confidential</h2>
            <p className="small mb-0">A tip is never shown to a business. Officers record what they find and can open an official case.</p></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Want your money back?</h2>
            <p className="small">A tip does not lead to a refund for you. For that, make a complaint.</p>
            <Link className="btn btn--secondary btn--sm" href="/complaint-or-tip">Make a complaint instead</Link></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>At a Sunday Market stall?</h2>
            <p className="small mb-0">Scan the QR code on the stall&apos;s price sheet to report a price above the sheet.</p></div>
          <CallBox freeCall={freeCall} text="Prefer to talk? Call free." />
        </aside>
      </div></div></section>
    </>
  );
}

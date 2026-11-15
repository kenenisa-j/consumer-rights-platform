import Link from "next/link";
import { bi } from "@/content/types";
import { RIGHTS, RESPONSIBILITIES, SCOPE } from "@/content/rights";
import { PageHead } from "@/components/ui/PageHead";
import { Accordion, Alert } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Your rights" };

// Prototype: public/rights.html
export default function RightsPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Your rights" }]} title={bi("Your rights as a consumer", "የሸማች መብቶችዎ")}
        lead="What you can expect when you buy goods or services in Addis Ababa, and what we can help with." />
      <section className="section"><div className="container"><div className="layout">
        <div className="stack">
          <Alert tone="warn" icon="file" title="Plain-language summary for review">
            The Directorate&apos;s legal office must check this text against the law before it is published. It is not legal advice.
          </Alert>
          <div><h2>Your rights<Am text="መብቶችዎ" /></h2><Accordion items={RIGHTS} /></div>
          <div><h2>Your responsibilities<Am text="ኃላፊነቶችዎ" /></h2><Accordion items={RESPONSIBILITIES} /></div>
          <div id="scope">
            <h2>What we can and cannot help with</h2>
            <div className="grid-2">
              <div className="card card--flat"><h3><Icon name="shield" /> We can help with</h3>
                <ul className="mb-0">{SCOPE.can.map(t => <li key={t}>{t}</li>)}</ul></div>
              <div className="card card--flat"><h3><Icon name="flag" /> We cannot decide</h3>
                <ul className="mb-0">{SCOPE.cannot.map(t => <li key={t}>{t}</li>)}</ul></div>
            </div>
          </div>
        </div>
        <aside className="side">
          <div className="card card--tint"><h2 style={{ fontSize: "1.05rem" }}>Something went wrong?</h2>
            <p className="small">Make a complaint and an officer will look at it.</p>
            <Link className="btn btn--accent btn--block" href="/complaint/new">Make a complaint</Link></div>
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Read the law</h2>
            <p className="small">The proclamations and directives behind these rights.</p>
            <Link href="/laws">Laws and documents</Link></div>
        </aside>
      </div></div></section>
    </>
  );
}

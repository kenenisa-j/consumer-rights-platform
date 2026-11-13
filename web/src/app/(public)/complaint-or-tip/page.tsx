import Link from "next/link";
import { bi } from "@/content/types";
import { freeCallNumber } from "@/lib/config";
import { PageHead } from "@/components/ui/PageHead";
import { Alert, CallBox } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Complaint or tip" };

const COMPLAINT = ["Rice sold short, or mixed with stones", "A phone sold as new that was used",
  "A kettle that stopped working after three days", "A service that was paid for and not done"];
const TIP = ["Prices above the official price list", "Goods hidden to push prices up", "Expired food on sale", "Scales that give short weight"];
const COMPARE = [
  ["What it is for", "Putting right something you bought", "A problem in the market that affects others"],
  ["Account", "Needed, with your contact details", "Not needed"],
  ["Anonymous", "No, but the business does not see your details", "Yes, if you choose"],
  ["Updates", "Case number, status, messages from the officer", "A private code to check that it was reviewed"],
  ["Possible result", "Refund, replacement, repair, or the case moves to a higher office", "An inspection, a warning, or a new official case"]
] as const;

// Prototype: public/complaint-or-tip.html. A decision page: which route fits you?
export default function ComplaintOrTipPage() {
  const freeCall = freeCallNumber();
  return (
    <>
      <PageHead crumbs={[{ label: "Complaint or tip" }]} title={bi("Complaint or tip?", "ቅሬታ ወይስ ጥቆማ?")}
        lead="Both reach the consumer protection office. They are handled differently, so choose the one that fits." />
      <section className="section"><div className="container stack">
        <div className="grid-2">
          <div className="card card--accent">
            <span className="icon-bubble icon-bubble--orange"><Icon name="chat" /></span>
            <h2 className="mt-4">Complaint<Am text="ቅሬታ" /></h2>
            <p><b>Choose this if you bought something and want it put right for you.</b></p>
            <ul>{COMPLAINT.map(t => <li key={t}>{t}</li>)}</ul>
            <p className="small muted">You need an account, what you bought, and the receipt or photos if you have them. The business never sees your name or phone number.</p>
            <div className="btn-row">
              <Link className="btn btn--accent" href="/sign-in?next=/complaint/new">Sign in and start</Link>
              <Link className="btn btn--ghost" href="/complaint/new">Already signed in? Start now</Link>
            </div>
          </div>
          <div className="card card--accent">
            <span className="icon-bubble"><Icon name="flag" /></span>
            <h2 className="mt-4">Tip<Am text="ጥቆማ" /></h2>
            <p><b>Choose this if you saw a problem in the market that affects many people.</b></p>
            <ul>{TIP.map(t => <li key={t}>{t}</li>)}</ul>
            <p className="small muted">No account is needed and you can stay anonymous. A tip does not get you a refund, but an officer can follow it up at the market.</p>
            <div className="btn-row"><Link className="btn" href="/tip">Send a tip</Link></div>
          </div>
        </div>
        <div>
          <h2>Side by side</h2>
          <div className="table-wrap"><table className="table table--stack">
            <caption className="visually-hidden">Complaint compared with tip</caption>
            <thead><tr><th scope="col"><span className="visually-hidden">Topic</span></th><th scope="col">Complaint</th><th scope="col">Tip</th></tr></thead>
            <tbody>{COMPARE.map(([k, a, b]) => (
              <tr key={k}><th scope="row">{k}</th><td data-label="Complaint">{a}</td><td data-label="Tip">{b}</td></tr>))}</tbody>
          </table></div>
        </div>
        <Alert icon="search" title="Reporting a price at a Sunday Market stall?">
          Scan the QR code on the stall&apos;s price sheet. Those reports go to the same office as tips.
        </Alert>
        <CallBox freeCall={freeCall} text="Not sure which one to choose? Call free and we will help you." />
      </div></section>
    </>
  );
}

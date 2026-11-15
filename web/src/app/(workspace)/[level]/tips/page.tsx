import { notFound } from "next/navigation";
import { serverGet } from "@/lib/server-api";
import { niceDate } from "@/lib/case-status";
import { Alert } from "@/components/ui/Display";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Tips" };

interface OfficeTip {
  reference: string; kind: string; place: string; business: string | null; product: string | null; text: string; status: string;
  receivedAt: string; subcity: string | null; woreda: string | null; office: string; contact: { name: string; phone: string | null } | null;
}

const INTRO = {
  woreda: "Market problems reported to your Woreda. Kept apart from complaints.",
  subcity: "Market problems reported in your Sub-City and its Woredas. Kept apart from complaints.",
  bureau: "Market problems reported across the city. Kept apart from complaints."
} as const;

const STATUS: Record<string, string> = { received: "Received", under_review: "Under review", follow_up_planned: "Follow-up planned", converted_to_case: "Became a case", closed_action_taken: "Closed, action taken", closed_no_action: "Closed, no action" };

// Prototype: woreda|subcity|bureau/tips.html. Read from the database. An anonymous tip carries no identity at all.
export default async function TipsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const tips = await serverGet<OfficeTip[]>("/office/tips");
  const fresh = (tips ?? []).filter(t => t.status === "received").length;
  return (
    <>
      <div className="ws-title"><div><h1>Tips</h1><p>{INTRO[level]}</p></div></div>
      {tips === null ? <Alert tone="warn" icon="flag" title="We could not load the tips.">Try again in a moment.</Alert> : (
        <>
          <div className="tiles">
            <div className={`tile${fresh ? " tile--alert" : ""}`}><b>{fresh}</b><span>New</span></div>
            <div className="tile"><b>{tips.length}</b><span>In all</span></div>
            <div className="tile"><b>{tips.filter(t => t.contact === null).length}</b><span>Anonymous</span></div>
          </div>
          {tips.length === 0 ? <div className="card center"><p className="mb-0">No tips have been sent to your office yet.</p></div> : (
            <div className="table-wrap"><table className="table table--stack">
              <caption className="visually-hidden">Tips</caption>
              <thead><tr><th scope="col">Tip</th><th scope="col">Where</th><th scope="col">Received</th><th scope="col">Status</th></tr></thead>
              <tbody>{tips.map(t => (
                <tr key={t.reference}>
                  <td><b>{t.reference}</b><small>{t.kind}{t.business ? ` · ${t.business}` : ""}{t.product ? ` · ${t.product}` : ""}</small><small>{t.text}</small></td>
                  <td data-label="Where">{t.place}{t.subcity ? <small>{t.subcity.replace(/-/g, " ").toLowerCase()}{t.woreda ? `, Woreda ${Number(t.woreda)}` : ""}</small> : null}</td>
                  <td data-label="Received">{niceDate(t.receivedAt)}{t.contact ? <small>Contact: {t.contact.name}{t.contact.phone ? `, ${t.contact.phone}` : ""}</small> : <small>Anonymous</small>}</td>
                  <td data-label="Status"><span className={`status${t.status === "received" ? " status--warn" : ""}`}>{STATUS[t.status] ?? t.status}</span></td>
                </tr>))}</tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}

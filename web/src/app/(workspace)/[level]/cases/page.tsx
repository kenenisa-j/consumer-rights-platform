import Link from "next/link";
import { notFound } from "next/navigation";
import { getOfficeCases, isClosed, isOverdue, needsAction, toRows } from "@/lib/gov-data";
import { Alert } from "@/components/ui/Display";
import { CasesTable } from "@/features/gov/CasesTable";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Cases" };

const INTRO = {
  woreda: "Complaints held by your Woreda office",
  subcity: "Complaints held by your Sub-City office and the Woredas under it",
  bureau: "Every complaint that is with a government office, and who holds it now"
} as const;

// Prototype: woreda|subcity|bureau/cases.html. The list comes from the database, limited to what this office may see.
export default async function CasesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  const data = await getOfficeCases();
  const cases = data?.cases ?? [];
  const open = cases.filter(c => !isClosed(c));
  const at = (l: string) => open.filter(c => c.handledBy?.level === l).length;
  const tiles: [number, string][] = level === "bureau"
    ? [[open.length, "Open in the city"], [at("woreda"), "At a Woreda"], [at("subcity"), "At a Sub-City"], [at("bureau"), "At the City Bureau"]]
    : [[cases.filter(needsAction).length, "Need your action"], [open.filter(c => !needsAction(c)).length, "In progress"], [cases.filter(isClosed).length, "Closed"], [cases.filter(isOverdue).length, "Overdue"]];
  return (
    <>
      <div className="ws-title">
        <div><h1>Cases</h1><p>{data ? `${INTRO[level]}: ${data.office.name}` : INTRO[level]}</p></div>
        <Link className="btn btn--accent" href={`/${level}/intake`}>New complaint</Link>
      </div>
      {data === null ? <Alert tone="warn" icon="flag" title="We could not load the cases.">Try again in a moment.</Alert> : (
        <>
          <div className="tiles">{tiles.map(([v, label]) => <div key={label} className="tile"><b>{v}</b><span>{label}</span></div>)}</div>
          <CasesTable level={level} rows={toRows(level, cases)} />
        </>
      )}
    </>
  );
}

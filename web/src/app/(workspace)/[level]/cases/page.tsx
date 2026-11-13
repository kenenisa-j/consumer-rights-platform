import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_ROWS, CASE_TILES } from "@/mocks/gov-lists";
import { CasesTable } from "@/features/gov/CasesTable";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Cases" };

const INTRO = {
  woreda: "Complaints held by Woreda 7, Akaki Kality",
  subcity: "Complaints the Woredas of Akaki Kality could not resolve",
  bureau: "Every complaint that is with a government office, and who holds it now"
} as const;

// Prototype: woreda|subcity|bureau/cases.html
export default async function CasesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return (
    <>
      <div className="ws-title">
        <div><h1>Cases</h1><p>{INTRO[level]}</p></div>
        <Link className="btn btn--accent" href={`/${level}/intake`}>New complaint</Link>
      </div>
      <div className="tiles">{CASE_TILES[level].map(t => <div key={t.label} className="tile"><b>{t.value}</b><span>{t.label}</span></div>)}</div>
      <CasesTable level={level} rows={CASE_ROWS[level]} />
    </>
  );
}

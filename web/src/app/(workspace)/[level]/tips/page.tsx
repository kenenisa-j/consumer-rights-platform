import { notFound } from "next/navigation";
import { TIP_INTRO, TIP_TILES } from "@/mocks/gov-tips";
import { TipsTable } from "@/features/gov/TipsTable";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Tips" };

// Prototype: woreda|subcity|bureau/tips.html. Tips are kept apart from complaints.
export default async function TipsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>Tips</h1><p>{TIP_INTRO[level]}</p></div></div>
      <div className="tiles">{TIP_TILES[level].map(t => <div key={t.label} className={`tile${t.alert ? " tile--alert" : ""}`}><b>{t.value}</b><span>{t.label}</span></div>)}</div>
      <TipsTable level={level} />
    </>
  );
}

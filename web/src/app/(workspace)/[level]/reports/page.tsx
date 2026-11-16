import { notFound } from "next/navigation";
import { ReportsView } from "@/features/gov/ReportsView";
import { isGovLevel } from "@/features/gov/levels";
import { REPORTS, type Report } from "@/mocks/gov-reports";

export const metadata = { title: "Reports" };

// Prototype: woreda|subcity|bureau/reports.html. Scoped to the level: market, Woreda or the whole city.
export default async function ReportsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();

  let report: Report = REPORTS[level];

  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const [overviewRes, categoryRes] = await Promise.all([
        fetch(`${API_URL}/api/government/reports/overview`, {
          headers: { cookie: jar.toString() },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/government/reports/cases-by-category`, {
          headers: { cookie: jar.toString() },
          cache: "no-store",
        }),
      ]);

      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        const catBody = categoryRes.ok ? await categoryRes.json() : null;
        const categories = Array.isArray(catBody?.categories) ? catBody.categories : [];

        const tiles = [
          { value: String(ov.totalComplaints ?? report.tiles[0].value), label: "Received" },
          { value: String(ov.resolvedCount ?? report.tiles[1].value), label: "Resolved" },
          { value: `${ov.slaComplianceRatePercent ?? 100}%`, label: "SLA compliance" },
          { value: `${ov.averageResolutionDays ?? 0} days`, label: "Average to resolve" },
        ];

        const sections = [...report.sections];
        if (categories.length > 0) {
          sections[0] = {
            title: "By category",
            note: "Real-time complaint count by category.",
            bars: categories.map((c: any) => ({
              label: c.name || c.code || "Other",
              value: Number(c.count) || 0,
            })),
          };
        }

        report = {
          range: `Live Operational Report · ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`,
          tiles,
          sections,
        };
      }
    }
  } catch {
    // fallback to demo mock data
  }

  return <ReportsView level={level} initialReport={report} />;
}

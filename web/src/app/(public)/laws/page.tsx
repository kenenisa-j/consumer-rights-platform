import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { Alert } from "@/components/ui/Display";
import { LawsList } from "@/features/info/LawsList";

export const metadata = { title: "Laws and documents" };

// Prototype: public/laws.html. Improved: search plus type filter with a live result count.
export default function LawsPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Laws and documents" }]} title={bi("Laws and documents", "ሕጎችና ሰነዶች")}
        lead="The laws, directives and guides behind consumer protection in Addis Ababa." />
      <section className="section"><div className="container stack">
        <Alert tone="warn" icon="file" title="To be verified by the legal office">
          Titles and summaries are shown for review. Documents marked as drafts are not final.
        </Alert>
        <LawsList />
      </div></section>
    </>
  );
}

import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { NewsList } from "@/features/info/NewsList";

export const metadata = { title: "News" };

// Prototype: public/news.html. Improved: filter by type instead of the placeholder paging.
export default function NewsPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "News" }]} title={bi("News and campaigns", "ዜናና ማስታወቂያዎች")}
        lead="Announcements, notices and awareness campaigns from the Customer Rights Protection Directorate." />
      <section className="section"><div className="container"><NewsList /></div></section>
    </>
  );
}

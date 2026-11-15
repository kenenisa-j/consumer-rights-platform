import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { getNews } from "@/lib/content";
import { NewsList } from "@/features/info/NewsList";

export const metadata = { title: "News" };

// Prototype: public/news.html. Improved: filter by type instead of the placeholder paging.
export default async function NewsPage() {
  const items = await getNews();
  return (
    <>
      <PageHead crumbs={[{ label: "News" }]} title={bi("News and campaigns", "ዜናና ማስታወቂያዎች")}
        lead="Announcements, notices and awareness campaigns from the Customer Rights Protection Directorate." />
      <section className="section"><div className="container"><NewsList items={items} /></div></section>
    </>
  );
}

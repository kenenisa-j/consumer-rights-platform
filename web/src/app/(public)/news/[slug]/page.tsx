import Link from "next/link";
import { notFound } from "next/navigation";
import { TAG_BADGE } from "@/content/library";
import { getNews } from "@/lib/content";
import { niceDate } from "@/lib/case-status";
import { PageHead } from "@/components/ui/PageHead";
import { Am } from "@/components/ui/Bi";
import { Alert } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const item = (await getNews()).find(n => n.slug === slug);
  return { title: item?.title ?? "News" };
}

// Prototype: public/news-article.html. One template for every item; short items show the excerpt as the body.
export default async function NewsArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const item = (await getNews()).find(n => n.slug === slug);
  if (!item) notFound();
  const body = item.body ?? [item.excerpt];
  return (
    <>
      <PageHead crumbs={[{ label: "News", href: "/news" }, { label: item.tag }]} title={item.title}>
        <p className="mb-0 mt-4"><span className={`badge ${TAG_BADGE[item.tag]}`.trim()}>{item.tag}</span>{" "}
          <time dateTime={item.publishedAt} className="small muted">{niceDate(item.publishedAt)} · Customer Rights Protection Directorate</time>
          {item.am && <Am text={item.am} />}</p>
      </PageHead>
      <section className="section"><div className="container narrow stack">
        <article>
          {body.map(p => <p key={p}>{p}</p>)}
          {item.checks && (<><h2>Three checks before you pay</h2><ol>{item.checks.map(c => <li key={c}>{c}</li>)}</ol>
            <p>If you find expired food on sale, <Link href="/tip">send a tip</Link>. If you already bought it,{" "}
              <Link href="/complaint/new">make a complaint</Link>.</p></>)}
        </article>
        {item.where && <Alert icon="pin" title="Where the officers will be">{item.where}</Alert>}
        <p><Link href="/news"><Icon name="arrow" /> All news</Link></p>
      </div></section>
    </>
  );
}

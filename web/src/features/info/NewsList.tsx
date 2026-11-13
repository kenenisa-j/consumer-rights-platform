"use client";

import Link from "next/link";
import { useState } from "react";
import { NEWS, NEWS_TAGS, TAG_BADGE, type NewsTag } from "@/content/library";
import { Icon } from "@/components/ui/Icon";

export function NewsList() {
  const [tag, setTag] = useState<NewsTag | "All">("All");
  const shown = NEWS.filter(n => tag === "All" || n.tag === tag);
  return (
    <>
      <div className="chips" role="radiogroup" aria-label="Show">
        {NEWS_TAGS.map(t => (
          <label key={t}><input type="radio" name="tag" checked={tag === t} onChange={() => setTag(t)} /> {t}</label>
        ))}
      </div>
      <p className="result-count" role="status">{shown.length} {shown.length === 1 ? "item" : "items"}</p>
      <div className="grid-3">
        {shown.map(n => (
          <Link key={n.slug} className="card news-card" href={`/news/${n.slug}`}>
            <span className="thumb"><Icon name={n.icon} /></span>
            <span className={`badge ${TAG_BADGE[n.tag]}`.trim()}>{n.tag}</span>
            <h3>{n.title}</h3>
            <p className="small muted mb-0">{n.excerpt}</p>
            <time dateTime={n.iso}>{n.date}</time>
          </Link>
        ))}
      </div>
    </>
  );
}

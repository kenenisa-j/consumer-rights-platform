// Laws, news and help content. Source: prototype/public/laws.html, news*.html, help.html.
// The items themselves come from the database (lib/content.ts). Only the filters and badge styles live here.
import type { LawKind, NewsTag } from "@/lib/content";

export const LAW_KINDS: ReadonlyArray<{ value: LawKind | "all"; label: string }> = [
  { value: "all", label: "All" }, { value: "proc", label: "Proclamations" },
  { value: "dir", label: "Directives" }, { value: "guide", label: "Guides" }
];

export const NEWS_TAGS: readonly (NewsTag | "All")[] = ["All", "Campaign", "Notice", "Announcement", "Result"];
export const TAG_BADGE: Record<NewsTag, string> = { Campaign: "badge--orange", Notice: "badge--green", Announcement: "", Result: "badge--green" };

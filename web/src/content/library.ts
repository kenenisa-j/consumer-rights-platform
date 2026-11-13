import type { IconName } from "@/components/ui/Icon";

// Laws, news and help content. Source: prototype/public/laws.html, news*.html, help.html.
// Demo content until the content module of the backend exists (Bureau "Public content" page).
export type LawKind = "proc" | "dir" | "guide";

export const LAW_KINDS: ReadonlyArray<{ value: LawKind | "all"; label: string }> = [
  { value: "all", label: "All" }, { value: "proc", label: "Proclamations" },
  { value: "dir", label: "Directives" }, { value: "guide", label: "Guides" }
];

export const LAWS: ReadonlyArray<{ id: string; kind: LawKind; kindLabel: string; title: string; text: string; source: string }> = [
  { id: "proc-813", kind: "proc", kindLabel: "Proclamation", title: "Trade Competition and Consumers Protection Proclamation No. 813/2013",
    text: "Federal law on fair trade and consumer protection.", source: "Federal Negarit Gazeta" },
  { id: "proc-84", kind: "proc", kindLabel: "Proclamation", title: "Addis Ababa City Administration Executive Organs Reorganization Proclamation No. 84/2016",
    text: "Sets up the city offices, including the Bureau of Trade.", source: "Addis Negari Gazeta" },
  { id: "dir-complaints", kind: "dir", kindLabel: "Directive", title: "Consumer complaint handling procedure",
    text: "How offices receive, investigate, reconcile and close complaints.", source: "Draft, Customer Rights Protection Directorate" },
  { id: "dir-ceilings", kind: "dir", kindLabel: "Directive", title: "Sunday Market price ceilings",
    text: "The weekly official prices at Sunday Markets.", source: "Bureau of Trade, every Friday" },
  { id: "guide-settlement", kind: "guide", kindLabel: "Guide", title: "Reconciliation and settlement guideline",
    text: "How a refund, replacement or repair is agreed and recorded.", source: "Draft, Customer Rights Protection Directorate" },
  { id: "guide-label", kind: "guide", kindLabel: "Guide", title: "Read the label: expiry dates and weights",
    text: "A one-page leaflet for shoppers.", source: "Awareness campaign 2026" }
];

export type NewsTag = "Campaign" | "Notice" | "Announcement" | "Result";

export interface NewsItem {
  slug: string; tag: NewsTag; icon: IconName; title: string; excerpt: string; iso: string; date: string;
  am?: string; body?: string[]; checks?: string[]; where?: string;
}

export const NEWS_TAGS: readonly (NewsTag | "All")[] = ["All", "Campaign", "Notice", "Announcement", "Result"];
export const TAG_BADGE: Record<NewsTag, string> = { Campaign: "badge--orange", Notice: "badge--green", Announcement: "", Result: "badge--green" };

export const NEWS: readonly NewsItem[] = [
  { slug: "check-before-you-buy", tag: "Campaign", icon: "calendar", iso: "2026-11-03", date: "3 November 2026",
    title: "Check before you buy: expiry dates at Sunday Markets", am: "ከመግዛትዎ በፊት ያረጋግጡ",
    excerpt: "Officers will be at 40 Sunday Markets this month showing shoppers how to read labels.",
    body: ["This month, consumer protection officers will be at 40 Sunday Markets to show shoppers how to read food labels and check weights.",
      "Many complaints about food could be avoided with a quick check before paying. Officers will hand out a one-page leaflet and answer questions at the market information desk."],
    checks: ["The expiry date. Look for \"Best before\" or \"Use by\". Do not buy food past the date.",
      "The package. Do not buy swollen tins or torn packets.",
      "The weight. Ask the seller to weigh in front of you, and compare with the price list."],
    where: "Akaki Kality, Bole, Kolfe Keranio and Yeka Sub-Cities first, then the others. The list for each Sunday is posted at the Woreda trade office." },
  { slug: "scales-checked", tag: "Notice", icon: "scale", iso: "2026-10-30", date: "30 October 2026",
    title: "Scales at all 282 Sunday Markets will be checked this month",
    excerpt: "Weights and measures teams start in Akaki Kality and Bole." },
  { slug: "complaints-online", tag: "Announcement", icon: "chat", iso: "2026-10-27", date: "27 October 2026",
    title: "Complaints can now be made online", excerpt: "Make a complaint and follow it without visiting an office." },
  { slug: "returned-to-consumers", tag: "Result", icon: "refresh", iso: "2026-10-20", date: "20 October 2026",
    title: "1.24 million ETB returned to consumers this quarter",
    excerpt: "Most cases were settled by agreement between the consumer and the business." },
  { slug: "sugar-and-oil", tag: "Notice", icon: "flag", iso: "2026-10-15", date: "15 October 2026",
    title: "Sugar and edible oil: report prices above the list", excerpt: "Use the tip form or the QR code on the stall's price sheet." },
  { slug: "ask-for-a-receipt", tag: "Campaign", icon: "file", iso: "2026-10-08", date: "8 October 2026",
    title: "Always ask for a receipt", excerpt: "A receipt is the best proof when something goes wrong." }
];

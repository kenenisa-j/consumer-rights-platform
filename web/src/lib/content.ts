import type { IconName } from "@/components/ui/Icon";
import { serverGet } from "./server-api";

// Public content kept in the database (news, laws and documents, questions and answers), read through `GET /api/content/:kind`.
// The content administrator writes it. When the service is down the lists are empty and the pages say so.
export type NewsTag = "Campaign" | "Notice" | "Announcement" | "Result";
export type LawKind = "proc" | "dir" | "guide";

export interface NewsItem {
  slug: string; publishedAt: string; tag: NewsTag; icon: IconName; title: string; excerpt: string; am?: string; body?: string[]; checks?: string[]; where?: string;
}
export interface LawItem { slug: string; kind: LawKind; kindLabel: string; title: string; text: string; source: string }
export interface FaqItem { slug: string; q: { en: string; am: string }; a: string; home?: boolean }

export const getNews = async () => (await serverGet<NewsItem[]>("/content/news", { auth: false })) ?? [];
export const getLaws = async () => (await serverGet<LawItem[]>("/content/law", { auth: false })) ?? [];
export const getFaq = async () => (await serverGet<FaqItem[]>("/content/faq", { auth: false })) ?? [];

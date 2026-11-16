import type { IconName } from "@/components/ui/Icon";

// Demo business: Gebriel Grain Traders (prototype/docs/demo-data.md). Real values come from the signed-in membership.
export const BUSINESS = {
  portal: "Business desk",
  name: "Gebriel Grain Traders",
  first: "Gebriel",
  place: "Market 097 ቃሊቲ ገብርኤል · Akaki Kality, Woreda 7",
  initials: "GG"
} as const;

export interface BizMenuItem { slug: string; label: string; icon: IconName; count?: number; owner?: "addisb2b" }

// Stock, orders and the profile belong to the existing AddisB2B business desk (open question 12). They appear in the
// menu so it matches what the business already knows, but are not part of this module.
export const BIZ_MENU: { title: string; items: BizMenuItem[] }[] = [
  { title: "Business", items: [
    { slug: "overview", label: "Overview", icon: "grid" },
    { slug: "stock", label: "Stock and prices", icon: "tag", owner: "addisb2b" },
    { slug: "orders", label: "Orders", icon: "bag", owner: "addisb2b" }] },
  { title: "Customers", items: [
    { slug: "complaints", label: "Consumer complaints", icon: "folder" },
    { slug: "messages", label: "Messages", icon: "chat" },
    { slug: "profile", label: "Business profile", icon: "building" }] }
];

import type { CaseRow, GovLevel, LevelDashboard } from "@/types/gov";

// Dashboards and case lists per level (prototype/{woreda,subcity,bureau}/dashboard.html, cases.html).
// Demo data. Rows without `hasDetail` have no case page in the demo yet.
export const DASHBOARDS: Record<GovLevel, LevelDashboard> = {
  woreda: {
    title: "Woreda 7, Akaki Kality", subtitle: "Complaints in your Woreda, after the business and the consumer could not agree",
    tiles: [{ value: "1", label: "New: moved up from a business", alert: true }, { value: "3", label: "My open cases" }, { value: "1", label: "Meeting this week" }, { value: "0", label: "Overdue" }],
    rows: [
      { label: "CC-2026-00123", sub: "Rice sold short · Gebriel Grain Traders, Market 097", what: "Moved up by the consumer: visit done, meeting held, not resolved. Decide the next step", waiting: "Meeting was Fri 6 Nov", href: "/woreda/cases/CC-2026-00123" },
      { label: "CC-2026-00140", sub: "Kettle · Kality Electronics (not on AddisB2B)", what: "Receipt received: resolve it here", waiting: "1 day", href: "/woreda/cases/CC-2026-00140" },
      { label: "CC-2026-00146", sub: "Short weight at Market 097 · Free call line", what: "New: accept it", waiting: "Today", href: "/woreda/cases/CC-2026-00146" },
      { label: "TIP-2026-00045", sub: "Sugar above the ceiling · near Market 097", what: "Review the tip and plan a visit", waiting: "2 days", href: "/woreda/tips" },
      { label: "1 call", sub: "Free call line", what: "Call the consumer back", waiting: "Today", href: "/woreda/calls" }],
    notes: [
      { title: "Free call line", text: "4 calls for Woreda 7 today, 1 to call back.", link: { href: "/woreda/calls", label: "Open the call log" } },
      { title: "Tips", text: "2 new tips in Woreda 7.", link: { href: "/woreda/tips", label: "Open the tips" } },
      { title: "How cases reach you", items: ["The consumer could not agree with a business on AddisB2B and moved the complaint to you", "The business is not on AddisB2B, so it came straight to you", "The consumer came in person"] },
      { title: "If you cannot resolve it", text: "Pass it to the Akaki Kality Sub-City from the case page." }]
  },
  subcity: {
    title: "Akaki Kality Sub-City", subtitle: "Cases the Woredas could not resolve",
    tiles: [{ value: "1", label: "New from a Woreda", alert: true }, { value: "9", label: "Open in the Sub-City" }, { value: "1", label: "Meeting today" }, { value: "2", label: "Overdue" }],
    rows: [
      { label: "CC-2026-00123", sub: "Rice sold short · Gebriel Grain Traders, Market 097", what: "Passed up by Woreda 7. Meeting today at 14:00", waiting: "Since Fri 6 Nov", href: "/subcity/cases/CC-2026-00123" },
      { label: "CC-2026-00131", sub: "Expired infant formula", what: "Passed up by Woreda 3. Inspect the shop", waiting: "2 days", urgent: true, href: "/subcity/cases" },
      { label: "2 tips", sub: "Woreda 5 and Woreda 11", what: "Send each tip to its Woreda", waiting: "Today", href: "/subcity/tips" },
      { label: "1 notice", sub: "From Woreda 7", what: "Approve a local notice", waiting: "3 days", href: "/subcity/content" }],
    notes: [
      { title: "Free call line", text: "4 calls for Akaki Kality today, 1 to call back.", link: { href: "/subcity/calls", label: "Open the call log" } },
      { title: "Tips", text: "2 new tips to send to a Woreda.", link: { href: "/subcity/tips", label: "Open the tips" } },
      { title: "Your place in the chain", text: "Business, then Woreda, then Sub-City, then the City Bureau. Resolve it here, or pass it to the City Bureau." }]
  },
  bureau: {
    title: "City Bureau dashboard", subtitle: "Addis Ababa City Bureau: the last level, and the whole city at a glance",
    tiles: [{ value: "1", label: "New: passed up by a Sub-City", alert: true }, { value: "45", label: "Open in the city" }, { value: "3", label: "Overdue" }, { value: "18", label: "Resolved this week" }],
    rows: [
      { label: "CC-2026-00123", sub: "Rice sold short · Gebriel Grain Traders", what: "Not resolved at the Woreda or the Sub-City. Settle it, or refer it", waiting: "Since Mon 9 Nov", href: "/bureau/cases/CC-2026-00123" },
      { label: "TIP-2026-00045", sub: "Sugar above the ceiling · Akaki Kality", what: "Review the tip", waiting: "2 days", href: "/bureau/tips" },
      { label: "2 calls", sub: "Free call line", what: "Turn into complaints", waiting: "Today", href: "/bureau/calls" }],
    spread: [{ label: "With a business", value: 14 }, { label: "At a Woreda", value: 28 }, { label: "At a Sub-City", value: 10 }, { label: "At the City Bureau", value: 3 }],
    notes: [
      { title: "Where the open cases are", text: "Every complaint starts with the business, then climbs: Woreda, Sub-City, City Bureau. You are the last level." },
      { title: "Tips", text: "3 new tips, 1 from a stall QR code.", link: { href: "/bureau/tips", label: "Open the tips inbox" } }]
  }
};

export const CASE_TILES: Record<GovLevel, { value: string; label: string }[]> = {
  woreda: [{ value: "2", label: "Need your action" }, { value: "3", label: "In progress" }, { value: "2", label: "Closed this month" }, { value: "0", label: "Overdue" }],
  subcity: [{ value: "1", label: "Need your action" }, { value: "2", label: "In progress" }, { value: "2", label: "Closed this month" }, { value: "2", label: "Overdue" }],
  bureau: [{ value: "45", label: "Open in the city" }, { value: "28", label: "At a Woreda" }, { value: "10", label: "At a Sub-City" }, { value: "3", label: "At the City Bureau" }]
};

export const CASE_COLUMNS: Record<GovLevel, string> = { woreda: "How it came", subcity: "Passed up by", bureau: "Held by" };

export const CASE_ROWS: Record<GovLevel, CaseRow[]> = {
  woreda: [
    { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", business: "Gebriel Grain Traders", via: "Moved up by the consumer", status: "Not resolved: decide", open: "5 days", group: "action", action: true, hasDetail: true },
    { reference: "CC-2026-00146", title: "Short weight at Market 097", business: "Unknown stall, Market 097", via: "Free call line", status: "New: accept", open: "Today", group: "action", action: true, hasDetail: true },
    { reference: "CC-2026-00140", title: "Kettle stopped working", business: "Kality Electronics", via: "Straight to the Woreda", status: "Information received", open: "3 days", group: "progress", hasDetail: true },
    { reference: "CC-2026-00129", title: "Sugar above the official ceiling", business: "Gebriel Grain Traders", via: "Moved up by the consumer", status: "Under investigation", open: "6 days", group: "progress" },
    { reference: "CC-2026-00137", title: "Sugar above the ceiling (from a tip)", business: "Kality Mini Market", via: "Tip TIP-2026-00045", status: "Visit planned", open: "1 day", group: "progress" },
    { reference: "CC-2026-00115", title: "Underweight flour", business: "Kality Mini Market", via: "Moved up by the consumer", status: "Resolved here: refund 600 ETB", open: "Closed", group: "closed" },
    { reference: "CC-2026-00118", title: "Rent deposit", business: "Private landlord", via: "Straight to the Woreda", status: "Outside the office's remit", open: "Closed", group: "closed" }],
  subcity: [
    { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", business: "Gebriel Grain Traders", via: "Woreda 7", status: "Meeting today", open: "3 days", group: "action", action: true, hasDetail: true },
    { reference: "CC-2026-00131", title: "Expired infant formula (urgent)", business: "Kality Mini Market", via: "Woreda 3", status: "Inspection", open: "2 days", group: "progress" },
    { reference: "CC-2026-00134", title: "Phone sold as new was used", business: "Tulu Dimtu Mobile", via: "Woreda 9", status: "Meeting set", open: "4 days", group: "progress" },
    { reference: "CC-2026-00109", title: "Cement bags short of 50 kg", business: "Akaki Building Supply", via: "Woreda 5", status: "Resolved here: replacement", open: "Closed", group: "closed" },
    { reference: "CC-2026-00102", title: "Fridge repair not done", business: "Saris Electronics", via: "Woreda 11", status: "Passed up to the City Bureau", open: "Closed here", group: "closed" }],
  bureau: [
    { reference: "CC-2026-00137", title: "Sugar above the ceiling (from tip)", business: "Kality Mini Market", via: "Woreda 7", status: "Visit planned", open: "1 day", group: "woreda" },
    { reference: "CC-2026-00131", title: "Expired infant formula (urgent)", business: "Kality Mini Market", via: "Akaki Kality Sub-City", status: "Inspection", open: "2 days", group: "subcity" },
    { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", business: "Gebriel Grain Traders", via: "City Bureau", status: "Last level: settle or refer", open: "0 days", group: "bureau", action: true, hasDetail: true },
    { reference: "CC-2026-00140", title: "Kettle stopped working", business: "Kality Electronics", via: "Woreda 7", status: "Information received", open: "3 days", group: "woreda" },
    { reference: "CC-2026-00118", title: "Rent deposit", business: "Private landlord", via: "Woreda 7", status: "Outside remit", open: "8 days", group: "woreda" }]
};

import type { Conversation } from "./conversations";
import type { GovLevel } from "@/types/gov";

// Conversations of each government level about CC-2026-00123 (prototype/{woreda,subcity,bureau}/messages.html).
// Staff see the consumer by name; the business sees only a number. Government-to-government is one of the four kinds.
const consumer = (open: boolean, closedNote?: string): Conversation => ({
  id: "consumer", initials: "HA", name: "Hirut Alemu", role: "Consumer · CC-2026-00123", caseRef: "CC-2026-00123", preview: "I will come.", day: "Fri 6 Nov", open, closedNote,
  items: [
    { kind: "msg", id: "h1", from: "them", who: "Hirut Alemu", text: "I moved the complaint to the Woreda because the business only offers a new sack and I want my money back.", when: "Wed 4 Nov, 08:30" },
    { kind: "msg", id: "h2", from: "me", who: "You", text: "I have accepted your complaint. I will visit the stall tomorrow and weigh the sacks.", when: "Wed 4 Nov, 10:07" },
    { kind: "msg", id: "h3", from: "me", who: "You", text: "I visited the stall. Three of four sacks were 21 to 22 kg. Please come to a meeting on Friday 6 November at 10:00.", when: "Thu 5 Nov, 15:00" },
    { kind: "msg", id: "h4", from: "them", who: "Hirut Alemu", text: "I will come.", when: "Thu 5 Nov, 15:20" }] });

const business = (open: boolean, closedNote?: string): Conversation => ({
  id: "business", initials: "GG", name: "Gebriel Grain Traders", role: "Business · Market 097", caseRef: "CC-2026-00123", preview: "We will attend.", day: "Thu 5 Nov", open, closedNote,
  items: [
    { kind: "msg", id: "g1", from: "me", who: "You", text: "I weighed four sacks from your supplier at your stall. Please come to a meeting on Friday 6 November at 10:00.", when: "Thu 5 Nov, 15:05" },
    { kind: "msg", id: "g2", from: "them", who: "Gebriel Grain Traders", text: "We will attend.", when: "Thu 5 Nov, 15:40" }] });

const office = (id: string, initials: string, name: string, role: string, preview: string, text: string, open: boolean): Conversation => ({
  id, initials, name, role, caseRef: "CC-2026-00123", preview, day: "Mon 9 Nov", open, closedNote: open ? undefined : "This case is no longer with that office.",
  items: [{ kind: "msg", id: `${id}1`, from: "them", who: name, text, when: "Mon 9 Nov, 09:25" }, { kind: "msg", id: `${id}2`, from: "me", who: "You", text: "Thank you. The visit findings are attached to the file.", when: "Mon 9 Nov, 09:40" }] });

export const GOV_CONVERSATIONS: Record<GovLevel, readonly Conversation[]> = {
  woreda: [
    office("subcity", "SC", "Akaki Kality Sub-City", "Tsehay Bekele, officer", "Received, thank you. I will hold a meeting.", "Received, thank you. I will hold a meeting on Monday 9 November at 14:00.", false),
    consumer(false, "The case moved up to the Sub-City, so write to the officer there."), business(false, "The case moved up to the Sub-City, so write to the officer there.")],
  subcity: [
    office("woreda", "W7", "Woreda 7 Trade Office", "Meron Tadesse, officer", "Visit findings are attached to the file.", "I passed the case up with the visit findings. Not resolved at the Woreda: the business would not agree to a refund.", false),
    office("bureau", "CB", "Addis Ababa City Bureau", "Yonas Girma, officer", "Not resolved at the Sub-City. Passed to you.", "Not resolved at the Sub-City. Meeting at 14:00 had no agreement. I have passed the case up to you.", false),
    consumer(false, "The case moved up to the City Bureau."), business(false, "The case moved up to the City Bureau.")],
  bureau: [
    office("subcity", "SC", "Akaki Kality Sub-City", "Tsehay Bekele, officer", "Not resolved at the Sub-City. Passed to you.", "Not resolved at the Sub-City. Meeting at 14:00 had no agreement. I have passed the case up to you.", true),
    consumer(true), business(true)]
};

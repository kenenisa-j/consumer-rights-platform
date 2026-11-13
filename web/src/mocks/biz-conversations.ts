import type { Conversation } from "./conversations";

// The business's conversations about CC-2026-00123 (prototype/merchant/messages.html). The consumer is only
// "Consumer 00123": the business never learns a name.
export const BIZ_CONVERSATIONS: readonly Conversation[] = [
  { id: "bureau", initials: "CB", name: "City Bureau", role: "Yonas Girma, officer", caseRef: "CC-2026-00123", preview: "A refund of 2,250 ETB has been proposed.", day: "Wed 11 Nov", open: true,
    items: [
      { kind: "msg", id: "b1", from: "them", who: "City Bureau", text: "The complaint reached the City Bureau. Please attend a meeting on Wednesday 11 November at 10:00.", when: "Tue 10 Nov, 09:15" },
      { kind: "msg", id: "b2", from: "me", who: "You", text: "We will attend.", when: "Tue 10 Nov, 09:50" },
      { kind: "offer", id: "b3", from: "them", who: "City Bureau", title: "Refund of 2,250 ETB", text: "Please confirm that you will pay it by Thursday 12 November, 12:00.", when: "Wed 11 Nov, 11:12", status: "waiting" }] },
  { id: "subcity", initials: "SC", name: "Akaki Kality Sub-City", role: "Tsehay Bekele, officer", caseRef: "CC-2026-00123", preview: "We will attend.", day: "Mon 9 Nov", open: false,
    closedNote: "This case moved to the City Bureau. Write to the officer there.",
    items: [
      { kind: "msg", id: "s1", from: "them", who: "Akaki Kality Sub-City", text: "Please attend a meeting today at 14:00 at the Akaki Kality Sub-City office about the rice complaint.", when: "Mon 9 Nov, 09:30" },
      { kind: "msg", id: "s2", from: "me", who: "You", text: "We will attend.", when: "Mon 9 Nov, 10:00" }] },
  { id: "woreda", initials: "W7", name: "Woreda 7 Trade Office", role: "Meron Tadesse, officer", caseRef: "CC-2026-00123", preview: "Not resolved. The complaint was passed up.", day: "Fri 6 Nov", open: false,
    closedNote: "This case moved up to the Sub-City and then the City Bureau.",
    items: [
      { kind: "msg", id: "w1", from: "them", who: "Woreda 7 Trade Office", text: "I visited your stall and weighed four sacks. Please come to a meeting on Friday 6 November at 10:00.", when: "Thu 5 Nov, 15:00" },
      { kind: "msg", id: "w2", from: "me", who: "You", text: "We will come.", when: "Thu 5 Nov, 15:40" },
      { kind: "sys", id: "w3", text: "Not resolved at the Woreda. The complaint was passed to Akaki Kality Sub-City.", when: "Fri 6 Nov, 11:30" }] },
  { id: "consumer", initials: "C", name: "Consumer 00123", role: "CC-2026-00123", caseRef: "CC-2026-00123", preview: "You could not agree. The consumer moved the complaint.", day: "Wed 4 Nov", open: false,
    closedNote: "The consumer moved the complaint to the Woreda, so the direct talk ended.",
    items: [
      { kind: "msg", id: "c1", from: "them", who: "Consumer 00123", text: "The sack weighed 21 kg and had small stones in it. I ask for my money back, 2,250 ETB.", when: "Mon 2 Nov, 09:40" },
      { kind: "msg", id: "c2", from: "me", who: "You", text: "We are sorry. The sacks come from our supplier and we did not weigh each one.", when: "Tue 3 Nov, 09:15" },
      { kind: "offer", id: "c3", from: "me", who: "You", title: "A new 25 kg sack", text: "Weighed in front of the consumer", when: "Tue 3 Nov, 09:15", status: "declined" },
      { kind: "msg", id: "c4", from: "them", who: "Consumer 00123", text: "A new sack is not enough for me. I would like a refund of 2,250 ETB.", when: "Tue 3 Nov, 12:05" },
      { kind: "msg", id: "c5", from: "me", who: "You", text: "We stand by our offer of a new sack.", when: "Tue 3 Nov, 12:40" },
      { kind: "sys", id: "c6", text: "You could not agree. The consumer moved the complaint to the Woreda 7 Trade Office.", when: "Wed 4 Nov, 08:30" }] }
];

export type OfferStatus = "waiting" | "accepted" | "declined";

export type ChatItem =
  | { kind: "msg"; id: string; from: "me" | "them"; who: string; text: string; when: string }
  | { kind: "sys"; id: string; text: string; when: string }
  | { kind: "offer"; id: string; from: "me" | "them"; who: string; title: string; text: string; when: string; status: OfferStatus };

export interface Conversation {
  id: string; initials: string; name: string; role: string; caseRef: string; preview: string; day: string;
  open: boolean; closedNote?: string; items: ChatItem[];
}

// Demo conversations of CC-2026-00123, newest level first (prototype/public/messages.html).
export const CONVERSATIONS: readonly Conversation[] = [
  { id: "bureau", initials: "CB", name: "City Bureau", role: "Yonas Girma, officer", caseRef: "CC-2026-00123", preview: "Thank you. I will come.", day: "Wed 11 Nov", open: true,
    items: [
      { kind: "sys", id: "b1", text: "The City Bureau accepted the complaint. Officer: Yonas Girma.", when: "Tue 10 Nov, 09:00" },
      { kind: "msg", id: "b2", from: "them", who: "City Bureau", text: "I am the City Bureau officer for your case. We will meet on Wednesday 11 November at 10:00.", when: "Tue 10 Nov, 09:10" },
      { kind: "msg", id: "b3", from: "me", who: "You", text: "Thank you. I will come.", when: "Tue 10 Nov, 09:30" },
      { kind: "offer", id: "b4", from: "them", who: "City Bureau", title: "Refund of 2,250 ETB", text: "In cash at the City Bureau office by Thursday 12 November, 12:00", when: "Wed 11 Nov, 11:10", status: "waiting" }
    ] },
  { id: "subcity", initials: "SC", name: "Akaki Kality Sub-City", role: "Tsehay Bekele, officer", caseRef: "CC-2026-00123", preview: "Not resolved at the Sub-City. The complaint was passed up.", day: "Mon 9 Nov", open: false,
    closedNote: "This case moved to the City Bureau. Write to the officer there.",
    items: [
      { kind: "sys", id: "s1", text: "Akaki Kality Sub-City accepted the complaint. Officer: Tsehay Bekele.", when: "Mon 9 Nov, 09:20" },
      { kind: "msg", id: "s2", from: "them", who: "Akaki Kality Sub-City", text: "I have read the file from Woreda 7. We will meet today, Monday 9 November, at 14:00 at the Sub-City office.", when: "Mon 9 Nov, 09:25" },
      { kind: "msg", id: "s3", from: "me", who: "You", text: "I will be there.", when: "Mon 9 Nov, 09:40" },
      { kind: "sys", id: "s4", text: "Not resolved at the Sub-City. The complaint was passed to the City Bureau.", when: "Mon 9 Nov, 16:30" }
    ] },
  { id: "woreda", initials: "W7", name: "Woreda 7 Trade Office", role: "Meron Tadesse, officer", caseRef: "CC-2026-00123", preview: "Not resolved at the Woreda. The business would not agree.", day: "Fri 6 Nov", open: false,
    closedNote: "This case moved up to the Sub-City and then the City Bureau.",
    items: [
      { kind: "sys", id: "w1", text: "Woreda 7 Trade Office accepted the complaint. Officer: Meron Tadesse.", when: "Wed 4 Nov, 10:05" },
      { kind: "msg", id: "w2", from: "them", who: "Woreda 7 Trade Office", text: "Hello. I have accepted your complaint. I will visit the stall tomorrow and weigh the sacks.", when: "Wed 4 Nov, 10:07" },
      { kind: "msg", id: "w3", from: "me", who: "You", text: "Thank you. I still have the sack if you need to see it.", when: "Wed 4 Nov, 10:30" },
      { kind: "msg", id: "w4", from: "them", who: "Woreda 7 Trade Office", text: "I visited the stall. Three of four sacks were 21 to 22 kg. I have invited you and the business to a meeting on Friday 6 November at 10:00 at our office.", when: "Thu 5 Nov, 15:00" },
      { kind: "msg", id: "w5", from: "me", who: "You", text: "I will come.", when: "Thu 5 Nov, 15:20" },
      { kind: "sys", id: "w6", text: "Not resolved at the Woreda. The business would not agree to a refund. The complaint was passed to Akaki Kality Sub-City.", when: "Fri 6 Nov, 11:30" }
    ] },
  { id: "business", initials: "GG", name: "Gebriel Grain Traders", role: "Market 097", caseRef: "CC-2026-00123", preview: "You could not agree. The consumer moved the complaint.", day: "Wed 4 Nov", open: false,
    closedNote: "You moved this case to the Woreda, so the talk with the business ended.",
    items: [
      { kind: "msg", id: "g1", from: "me", who: "You", text: "My complaint: the 25 kg sack of rice I bought on Sunday weighed 21 kg and had stones in it. I would like my money back, 2,250 ETB.", when: "Mon 2 Nov, 09:40" },
      { kind: "msg", id: "g2", from: "them", who: "Gebriel Grain Traders", text: "We are sorry. The sacks come from our supplier and we did not weigh each one.", when: "Tue 3 Nov, 09:15" },
      { kind: "offer", id: "g3", from: "them", who: "Gebriel Grain Traders", title: "A new 25 kg sack", text: "Weighed in front of you", when: "Tue 3 Nov, 09:15", status: "declined" },
      { kind: "msg", id: "g4", from: "me", who: "You", text: "A new sack is not enough for me. I would like a refund of 2,250 ETB.", when: "Tue 3 Nov, 12:05" },
      { kind: "offer", id: "g5", from: "me", who: "You", title: "Refund of 2,250 ETB", text: "In cash", when: "Tue 3 Nov, 12:05", status: "declined" },
      { kind: "msg", id: "g6", from: "them", who: "Gebriel Grain Traders", text: "We stand by our offer of a new sack.", when: "Tue 3 Nov, 12:40" },
      { kind: "sys", id: "g7", text: "You could not agree. The consumer moved the complaint to the Woreda 7 Trade Office.", when: "Wed 4 Nov, 08:30" }
    ] }
];

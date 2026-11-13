import { bi } from "./types";

// Source: prototype/public/rights.html, how-to-complain.html. Plain-language text: the Directorate's legal
// office must check it before publication (see open-questions). Not legal advice.
export const RIGHTS = [
  { id: "information", q: bi("To know the price and what you are buying", "ዋጋውንና የሚገዙትን የማወቅ"),
    a: "The price should be shown before you buy. You should be told the quality, the quantity and, for packaged food, the expiry date." },
  { id: "safe", q: bi("To buy goods that are safe and not expired", "ደህንነቱ የተጠበቀና ጊዜው ያላለፈ ዕቃ የመግዛት"),
    a: "Food past its expiry date, and goods that can harm health, must not be sold. Weights and measures must be correct." },
  { id: "choice", q: bi("To choose freely", "በነጻነት የመምረጥ"),
    a: "A seller cannot force you to buy one item to get another, or hide goods to push the price up." },
  { id: "receipt", q: bi("To get a receipt", "ደረሰኝ የማግኘት"),
    a: "Ask for a receipt every time. It shows what you paid, when and where, and it is the best proof if something goes wrong." },
  { id: "faulty", q: bi("To have faulty goods put right", "የተበላሸ ዕቃ እንዲስተካከል የመጠየቅ"),
    a: "If goods do not work or are not as described, you can ask for a refund, a replacement or a repair. A service that was paid for should be done as agreed." },
  { id: "complain", q: bi("To complain and be heard", "ቅሬታ የማቅረብና የመደመጥ"),
    a: "You can make a complaint. It goes to the business first. If you cannot agree, it moves to your Woreda trade office, then the Sub-City, then the City Bureau. Your complaint gets a number and you are told what happens." }
] as const;

export const RESPONSIBILITIES = [
  { id: "keep", q: bi("Keep your receipt and the goods", "ደረሰኙንና ዕቃውን ይያዙ"), a: "Do not throw away the item or its packaging until the problem is settled." },
  { id: "check", q: bi("Check before you pay", "ከመክፈልዎ በፊት ያረጋግጡ"), a: "Look at the expiry date, the weight and the price list." },
  { id: "truth", q: bi("Tell the truth", "እውነቱን ይናገሩ"), a: "Give correct facts in your complaint. False complaints can be closed." }
] as const;

export const SCOPE = {
  can: ["Goods and services you bought from a business in Addis Ababa", "Wrong prices, weights and measures",
    "Faulty, expired or unsafe goods", "Misleading advertising and sales tricks"],
  cannot: ["Rent, housing and land matters", "Work and salary disputes",
    "Disputes between two businesses (on AddisB2B these go through trade disputes)",
    "Crimes such as theft or fraud: go to the police"]
};

export const HOW_STEPS = [
  { n: 1, title: "Tell us", text: "Make a complaint online, or call the free line. You get a number at once.", status: "Submitted" },
  { n: 2, title: "The business replies", text: "A registered business gets your complaint first. You and the business can talk and agree an offer.", status: "With the business" },
  { n: 3, title: "Move it to your Woreda", text: "If you cannot agree, you move it to the Woreda trade office where you bought. A business that is not on AddisB2B goes straight here.", status: "Woreda office" },
  { n: 4, title: "Not resolved? The Sub-City", text: "If the Woreda cannot resolve it, it moves up to the Sub-City trade office.", status: "Sub-City office" },
  { n: 5, title: "Still not resolved? The City Bureau", text: "The Addis Ababa City Bureau is the last level. It settles the case or refers it for further action.", status: "City Bureau" },
  { n: 6, title: "Meetings and visits", text: "At each level an officer can ask for information, visit the business and bring you together to agree a solution.", status: "Under Investigation, Under Reconciliation" },
  { n: 7, title: "You agree a solution", text: "A refund, replacement or repair, recorded with proof.", status: "Settlement Pending" },
  { n: 8, title: "It is resolved", text: "When the solution is done, the case is closed.", status: "Resolved, Closed" }
] as const;

// Targets are PROPOSED, not approved (open question 6/18). Keep them configurable once settings exist.
export const HOW_TARGETS = [
  ["First check by the office", "2 working days"], ["The business replies", "48 hours"],
  ["A solution is agreed", "Depends on the case"]
] as const;

export const HAVE_READY = ["What you bought, when and where", "The name of the business", "The receipt, if you have it",
  "Photos of the problem", "What you want: refund, replacement or repair"] as const;

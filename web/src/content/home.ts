import { bi } from "./types";
import type { IconName } from "@/components/ui/Icon";

// Source: prototype/public/index.html. Sample figures and news are demo content until the API exists.
export const HERO = {
  kicker: "Customer Rights Protection Directorate",
  title: bi("Bought something faulty, unsafe or unfair?", "የተበላሸ፣ አደገኛ ወይም ፍትሃዊ ያልሆነ ዕቃ ገዝተዋል?"),
  leadBefore: "Tell the business first. If you cannot agree, your Woreda trade office steps in, then the Sub-City, then the City Bureau, until it is put right. Prefer to talk? Call free on ",
  complaint: bi("Make a complaint", "ቅሬታ ያቅርቡ"),
  track: bi("Track a case", "ጉዳይ ይከታተሉ"),
  paths: [
    { href: "/complaint-or-tip", icon: "chat" as IconName, orange: true, title: bi("Make a complaint", "ቅሬታ ያቅርቡ"),
      text: "You bought something and want it put right: a refund, a replacement or a repair. You get a case number and updates.",
      go: "Start a complaint" },
    { href: "#quick-tip", icon: "flag" as IconName, orange: false, title: bi("Report unfair trade in the market", "ጥቆማ ይስጡ"),
      text: "You saw overpricing, hidden stock, expired food or false weights. No account needed, and you can stay anonymous.",
      go: "Send a tip" }
  ],
  compare: "Not sure which one?"
};

export const NOTICE = { bold: "New:", text: " talk to the business first. If you cannot agree, move it to the Woreda. " };

export const TRACK = {
  label: bi("Already made a complaint? Enter its number", "የጉዳይ ቁጥር"),
  example: "CC-2026-00123",
  pattern: "(CC|TIP)-[0-9]{4}-[0-9]{5}",
  error: "Write the number as it was given to you, for example CC-2026-00123.",
  button: "Check the status"
};

export const DOORS = {
  kicker: "Sign in",
  title: bi("Who are you?", "እርስዎ ማን ነዎት?"),
  intro: "Each one has its own place. Choose how you sign in.",
  items: [
    { icon: "user" as IconName, title: "Consumer", text: "An individual who bought goods or a service." },
    { icon: "bag" as IconName, title: "Business", text: "Settle a complaint directly with the consumer." },
    { icon: "pin" as IconName, title: "Woreda", text: "First government level." },
    { icon: "users" as IconName, title: "Sub-City", text: "Second government level." },
    { icon: "shield" as IconName, title: "City Bureau", text: "Final level and administration." }
  ]
};

export const HOW = {
  kicker: "How it works",
  title: bi("From your complaint to an outcome", "ከቅሬታ እስከ ውጤት"),
  intro: "Every complaint gets a number. It goes to the business first, then climbs: Woreda, Sub-City, City Bureau, until it is resolved.",
  steps: [
    ["Tell us what happened", "Online, at any time. Add the receipt or photos if you have them."],
    ["The business replies", "You and the business talk and can agree an offer, all in one place."],
    ["Your Woreda steps in", "If you cannot agree, move it to your Woreda office. Not resolved there, it goes to the Sub-City, then the City Bureau."],
    ["You get an outcome", "A refund, a replacement or a repair, recorded with proof."]
  ],
  link: "Read the full process"
};

export const RIGHTS = {
  kicker: "Know your rights",
  title: bi("Three things every shopper should know", "ሁሉም ሸማች ሊያውቃቸው የሚገቡ ሦስት ነገሮች"),
  items: [
    { href: "/rights#receipt", icon: "file" as IconName, title: "Ask for a receipt",
      text: "A receipt shows what you paid and where. It is the best proof if something goes wrong." },
    { href: "/rights#safe", icon: "shield" as IconName, title: "Check the date and the weight",
      text: "Food past its expiry date and short weights are not allowed. Check before you pay." },
    { href: "/rights#faulty", icon: "refresh" as IconName, title: "Faulty goods can be put right",
      text: "Goods that do not work as promised can be refunded, replaced or repaired." }
  ],
  link: "All your rights"
};

export const FIGURES = {
  kicker: "This quarter",
  title: bi("What the offices handled", "በዚህ ሩብ ዓመት"),
  intro: "Sample figures for the prototype. The live page will show real counts.",
  items: [
    ["412", "complaints received"], ["318", "complaints resolved"],
    ["1.24 M", "ETB returned to consumers"], ["96", "market tips received"]
  ]
};

export const NEWS = {
  kicker: "News and campaigns",
  title: bi("Latest from the Directorate", "ዜናና ማስታወቂያዎች"),
  all: "All news",
  items: [
    { href: "/news/article", icon: "calendar" as IconName, badge: "badge--orange", tag: "Campaign",
      title: "Check before you buy: expiry dates at Sunday Markets", iso: "2026-11-03", date: "3 November 2026" },
    { href: "/news", icon: "scale" as IconName, badge: "badge--green", tag: "Notice",
      title: "Scales at all 282 Sunday Markets will be checked this month", iso: "2026-10-30", date: "30 October 2026" },
    { href: "/news", icon: "chat" as IconName, badge: "", tag: "Announcement",
      title: "Complaints can now be made online", iso: "2026-10-27", date: "27 October 2026" }
  ]
};

export const FAQ = {
  kicker: "Quick answers",
  title: bi("Before you start", "ከመጀመርዎ በፊት"),
  items: [
    { q: bi("Does it cost anything?", "ክፍያ አለው?"), a: "No. A complaint, a tip and the free call line cost nothing." },
    { q: bi("Will the business know it was me?", "ድርጅቱ እኔ መሆኔን ያውቃል?"), a: "The business sees your complaint but never your name, phone or address." },
    { q: bi("I have no receipt", "ደረሰኝ የለኝም"), a: "You can still complain. Add photos or messages that show the purchase." },
    { q: bi("What if the business does not answer?", "ድርጅቱ ባይመልስስ?"),
      a: "Move it to your Woreda trade office. An officer reviews your complaint and helps you settle. If it is not resolved there, it goes to the Sub-City and then the City Bureau." }
  ],
  link: "More questions and answers"
};

export const TALK = {
  title: bi("Prefer to talk?", "ማነጋገር ይመርጣሉ?"),
  beforeNumber: "Call free on ", afterNumber: ", or visit an office. We enter your complaint for you.",
  find: "Find an office"
};

export const QUICK_TIP = {
  title: bi("Report unfair trade", "ኢፍትሃዊ ንግድ ጠቁሙ"),
  intro: "No account needed. You can stay anonymous.",
  kinds: ["Prices above the official list", "Goods hidden or held back", "Expired or unsafe goods on sale",
    "False scales or short weight", "Something else"]
};

export const SUB_CITIES = ["Addis Ketema", "Akaki Kality", "Arada", "Bole", "Gulele", "Kirkos",
  "Kolfe Keranio", "Lemi Kura", "Lideta", "Nifas Silk-Lafto", "Yeka"];

import { bi } from "./types";
import { SUB_CITIES } from "./common";

export const FAQ_ITEMS = [
  { id: "who", q: bi("Who can make a complaint?", "ቅሬታ ማቅረብ የሚችለው ማነው?"), a: "Anyone who bought goods or a service from a business in Addis Ababa. You need an account with your phone number." },
  { id: "cost", q: bi("Does it cost anything?", "ክፍያ አለው?"), a: "No. Making a complaint or a tip is free." },
  { id: "business-sees", q: bi("Will the business know it was me?", "ድርጅቱ እኔ መሆኔን ያውቃል?"),
    a: "The business sees the case number and the facts it needs to reply. It does not see your name, phone, email or address. If you meet to agree a solution, you meet in person at the office." },
  { id: "no-receipt", q: bi("I have no receipt. Can I still complain?", "ደረሰኝ የለኝም። ቅሬታ ማቅረብ እችላለሁ?"),
    a: "Yes. Add photos, messages or anything else that shows the purchase. The officer may ask for more." },
  { id: "which-office", q: bi("Which office will handle my complaint?", "ቅሬታዬን የትኛው ቢሮ ያያል?"),
    a: "The business first. If you cannot agree, your Woreda trade office steps in. Not resolved there, it moves to the Sub-City, and finally to the City Bureau." },
  { id: "tip-refund", q: bi("Can I get my money back through a tip?", "በጥቆማ ገንዘቤ ይመለሳል?"),
    a: "No. A tip helps officers act in the market. To get something put right for you, make a complaint." },
  { id: "privacy", q: bi("How is my data used?", "መረጃዬ እንዴት ይያዛል?"),
    a: "Only consumer protection officers who handle your case can see your details. Businesses never see them." },
  { id: "account", q: bi("I forgot my password", "የይለፍ ቃሌን ረሳሁ"),
    a: "Use \"Forgot your password?\" on the sign-in page to get a reset link by email or SMS, or call free on {call}." }
] as const;

// Phone numbers and addresses will be added once confirmed (prototype note).
export const OFFICES: ReadonlyArray<{ area: string; name: string }> = [
  { area: "Bureau", name: "Customer Rights Protection Directorate, Bureau of Trade, central office" },
  ...SUB_CITIES.map(s => ({ area: s, name: `${s} Sub-City Trade Office, consumer protection desk` }))
];
export const OFFICE_HOURS = "Mon–Fri, 8:30–17:30";

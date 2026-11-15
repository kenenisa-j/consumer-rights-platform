import { bi } from "./types";

// Public site chrome: header navigation, sign-in roles, footer. Source: prototype/public/index.html.
export const NAV = [
  { href: "/", label: bi("Home", "መነሻ") },
  { href: "/complaint-or-tip", label: bi("Make a complaint", "ቅሬታ ያቅርቡ") },
  { href: "/tip", label: bi("Report unfair trade", "ኢፍትሃዊ ንግድ ጥቆማ") },
  { href: "/track", label: bi("Track a case", "ጉዳይ ይከታተሉ") },
  { href: "/rights", label: bi("Your rights", "መብትዎ") },
  { href: "/laws", label: bi("Laws and documents", "ሕጎችና ሰነዶች") },
  { href: "/news", label: bi("News", "ዜና") },
  { href: "/help", label: bi("Help", "እገዛ") }
] as const;

export const BRAND = {
  name: "AddisB2B",
  tagline: "Consumer Protection",
  taglineAm: "የሸማቾች መብት ጥበቃ"
} as const;

/** The five sign-ins. `landing` is where each one opens (routes are built per slice). */
export const SIGN_IN_ROLES = [
  { key: "consumer", tab: "Consumer", hint: "For individuals who bought goods or a service.",
    idLabel: "Phone number or email", button: "Sign in as Consumer", am: "ሸማች", landing: "/my-cases" },
  { key: "business", tab: "Business", hint: "Settle a complaint directly with the consumer.",
    idLabel: "Business phone number or email", button: "Sign in as Business", am: "ንግድ", landing: "/business/overview" },
  { key: "woreda", tab: "Woreda", hint: "Woreda trade office officers. The first government level.",
    idLabel: "Work email or staff ID", button: "Sign in as Woreda", am: "ወረዳ", landing: "/woreda/dashboard" },
  { key: "subcity", tab: "Sub-City", hint: "Sub-City trade office officers. The second level.",
    idLabel: "Work email or staff ID", button: "Sign in as Sub-City", am: "ክፍለ ከተማ", landing: "/subcity/dashboard" },
  { key: "bureau", tab: "City Bureau", hint: "Addis Ababa City Bureau officers and administrators. The final level.",
    idLabel: "Work email or staff ID", button: "Sign in as City Bureau", am: "ከተማ ቢሮ", landing: "/bureau/dashboard" }
] as const;

export const FOOTER = {
  about: {
    title: "Customer Rights Protection Directorate",
    text: "Addis Ababa City Administration Bureau of Trade, working with the trade offices of the 11 Sub-Cities and their Woredas.",
    am: "የሸማቾች መብት ጥበቃ ዳይሬክቶሬት"
  },
  help: { title: "Get help", links: [
    ["/complaint-or-tip", "Make a complaint"], ["/tip", "Report unfair trade"],
    ["/track", "Track a case"], ["/help", "Questions and answers"]] },
  learn: { title: "Learn", links: [
    ["/rights", "Your rights"], ["/how-to-complain", "How a complaint works"],
    ["/laws", "Laws and documents"], ["/news", "News and campaigns"]] },
  contact: { title: "Contact" },
  note: ["Part of AddisB2B · Hemin Trade Network", "© Addis Ababa City Administration"]
} as const;

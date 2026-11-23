import { bi } from "./types";

// Public site chrome: header navigation, sign-in roles, footer. Source: prototype/public/index.html.
export interface NavLink { href: string; label: string }
export type NavEntry = NavLink | { label: string; items: NavLink[] };

/** The header menu. A group opens its list when the pointer is over it (or it has the keyboard focus) and closes when the pointer leaves. */
export const NAV: NavEntry[] = [
  { href: "/", label: "Home" },
  { href: "/complaint/new", label: "Make a complaint" },
  { href: "/tip", label: "Report unfair trade" },
  { href: "/track", label: "Track a case" },
  { label: "Learn", items: [
    { href: "/rights", label: "Your rights" }, { href: "/how-to-complain", label: "How a complaint works" }, { href: "/laws", label: "Laws and documents" }] },
  { href: "/news", label: "News" },
  { label: "Help", items: [
    { href: "/help", label: "Questions and answers" }, { href: "/help#offices", label: "Find an office" }] }
];

export const BRAND = {
  org: "Addis Ababa City Administration",
  name: "Trade Bureau",
  logo: "/brand/trade-bureau-logo.png"
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
    ["/complaint/new", "Make a complaint"], ["/tip", "Report unfair trade"],
    ["/track", "Track a case"], ["/help", "Questions and answers"]] },
  learn: { title: "Learn", links: [
    ["/rights", "Your rights"], ["/how-to-complain", "How a complaint works"],
    ["/laws", "Laws and documents"], ["/news", "News and campaigns"]] },
  contact: { title: "Contact" },
  note: ["Part of AddisB2B · Hemin Trade Network", "© Addis Ababa City Administration"]
} as const;

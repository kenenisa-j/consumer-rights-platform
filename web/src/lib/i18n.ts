// Languages of the system. English is the source text in the code; the other four are dictionaries in src/i18n/dict.
export const LOCALES = [
  { code: "en", name: "English", native: "English" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "om", name: "Afan Oromo", native: "Afaan Oromoo" },
  { code: "ti", name: "Tigrigna", native: "ትግርኛ" },
  { code: "so", name: "Somali", native: "Soomaali" }
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cr-lang";
export const isLocale = (v: unknown): v is Locale => LOCALES.some(l => l.code === v);

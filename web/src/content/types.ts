/** A label in both languages. Every user-facing string lives in a content module as this shape. */
export interface Bilingual {
  en: string;
  am: string;
}

export const bi = (en: string, am: string): Bilingual => ({ en, am });

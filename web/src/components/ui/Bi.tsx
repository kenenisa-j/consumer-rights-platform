import type { Bilingual } from "@/content/types";

/** English text followed by the Amharic line, exactly as the prototype shows it. */
export function Am({ text }: { text: string }) {
  return <span className="am" lang="am">{text}</span>;
}

/** `<Bi t={{ en, am }} />` renders the English text with the Amharic line beneath. */
export function Bi({ t }: { t: Bilingual }) {
  return <>{t.en}<Am text={t.am} /></>;
}

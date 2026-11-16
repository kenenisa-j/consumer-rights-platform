import { CORE, type Row } from "./master-core";
import { FORMS } from "./master-forms";
import { PORTAL } from "./master-portal";
import { HOME } from "./master-home";

export type { Row };
export const MASTER: readonly Row[] = [...CORE, ...FORMS, ...PORTAL, ...HOME];

/** One language's dictionary: English text -> text in that language (index 1 = Amharic, 2 = Afan Oromo, 3 = Tigrigna, 4 = Somali). */
export const dictionary = (column: 1 | 2 | 3 | 4): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const row of MASTER) out[row[0]] = row[column];
  return out;
};

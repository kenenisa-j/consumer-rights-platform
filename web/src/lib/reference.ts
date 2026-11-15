import { serverGet } from "./server-api";

/** Lists the forms need, read from the database through the API (`GET /api/reference`). */
export interface RefData {
  categories: { code: string; nameEn: string; nameAm: string; defaultSlaDays: number }[];
  subcities: { code: string; name: string; nameAm: string; officeId: string; woredas: { number: number; officeId: string }[] }[];
  bureau: { officeId: string; nameEn: string; nameAm: string } | null;
}

export const EMPTY_REF: RefData = { categories: [], subcities: [], bureau: null };

export async function getReference(): Promise<RefData> {
  return (await serverGet<RefData>("/reference", { auth: false })) ?? EMPTY_REF;
}

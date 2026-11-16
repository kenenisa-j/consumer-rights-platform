// Development reference data: complaint categories, the City Bureau, the 11 Sub-City trade offices with their Woreda offices,
// a few registered businesses and the public content (news, laws, questions). Every write is an upsert, so it is safe to run again.
import { readFileSync } from "node:fs";
import { COMPLAINT_CATEGORIES } from "@consumer-rights/contracts";

const json = name => JSON.parse(readFileSync(new URL(`./content/${name}.json`, import.meta.url), "utf8"));

const SUB_CITIES = [
  ["Addis Ketema", 9], ["Akaki Kality", 13], ["Arada", 10], ["Bole", 14], ["Gulele", 10], ["Kirkos", 11],
  ["Kolfe Keranio", 15], ["Lemi Kura", 15], ["Lideta", 10], ["Nifas Silk-Lafto", 15], ["Yeka", 13]
];

const CATEGORY_NAMES = {
  misleading_commercial_practice: ["Misleading commercial practice", "አሳሳች የንግድ አሠራር"], defective_goods: ["Defective or substandard goods", "የተበላሸ ወይም ደረጃውን ያልጠበቀ ዕቃ"],
  expired_products: ["Expired products", "ጊዜው ያለፈበት ምርት"], unsafe_products: ["Unsafe products", "ደህንነቱ ያልተጠበቀ ምርት"],
  price_above_ceiling: ["Price above the official ceiling", "ከተፈቀደው ጣሪያ በላይ ዋጋ"], wrong_weight_measure: ["Wrong weight or measure", "የተሳሳተ ክብደት ወይም መለኪያ"],
  service_complaint: ["Service complaint", "የአገልግሎት ቅሬታ"], other: ["Other", "ሌላ"]
};

const slug = name => name.toUpperCase().replace(/[^A-Z]+/g, "-");

export async function seedReference(db) {
  for (const code of COMPLAINT_CATEGORIES) {
    const [nameEn, nameAm] = CATEGORY_NAMES[code];
    await db.complaintCategory.upsert({ where: { code }, update: { nameEn, nameAm }, create: { code, nameEn, nameAm, defaultSlaDays: code === "unsafe_products" ? 2 : 5 } });
  }

  const office = (code, data) => db.administrativeOffice.upsert({ where: { code }, update: {}, create: { code, ...data } });
  const bureau = await office("AA-BUREAU", { nameEn: "Addis Ababa Bureau of Trade and Market Development", nameAm: "የአዲስ አበባ ንግድና ገበያ ልማት ቢሮ", level: "CITY_BUREAU", address: "Addis Ababa", phone: "+251111000000" });
  const offices = { bureau, "AA-BUREAU": bureau };
  let n = 0;
  for (const [name, woredas] of SUB_CITIES) {
    const sc = slug(name);
    const sub = await office(`SC-${sc}`, { nameEn: `${name} Sub-City Trade Office`, nameAm: `${name} ክፍለ ከተማ ንግድ ጽሕፈት ቤት`, level: "SUBCITY", parentOfficeId: bureau.id, subcityCode: sc, address: name, phone: `+2511110001${String(++n).padStart(2, "0")}` });
    offices[`SC-${sc}`] = sub;
    for (let w = 1; w <= woredas; w++) {
      const nn = String(w).padStart(2, "0");
      offices[`WO-${sc}-${nn}`] = await office(`WO-${sc}-${nn}`, { nameEn: `${name} Woreda ${w} Trade Office`, nameAm: `${name} ወረዳ ${w} ንግድ ጽሕፈት ቤት`, level: "WOREDA", parentOfficeId: sub.id, subcityCode: sc, woredaCode: nn, address: `${name}, Woreda ${w}`, phone: `+251111${String(1000 + n * 20 + w).padStart(4, "0")}` });
    }
  }

  const merchants = [
    ["AA-TRD-0001", "Gebriel Grain Traders", "Wholesale", "Grain", "WO-AKAKI-KALITY-07"],
    ["AA-TRD-0002", "Gebriel Mini Shop", "Market trader", "Groceries", "WO-BOLE-03"],
    ["AA-TRD-0003", "Kality Mini Market", "Shop", "Groceries", "WO-AKAKI-KALITY-07"],
    ["AA-TRD-0004", "Lideta Electronics", "Shop", "Electronics", "WO-LIDETA-05"],
    ["AA-TRD-0005", "Kality Electronics", "Shop", "Electronics", "WO-AKAKI-KALITY-07"]
  ];
  for (const [registrationNumber, tradeName, businessType, businessCategory, officeCode] of merchants) {
    await db.merchant.upsert({
      where: { registrationNumber }, update: {},
      create: { registrationNumber, tradeName, legalName: `${tradeName} PLC`, businessType, businessCategory, woredaOfficeId: offices[officeCode].id, phoneNumber: "+251911000000" }
    });
  }

  const put = (kind, slugValue, sortOrder, data, publishedAt) => db.contentItem.upsert({
    where: { kind_slug: { kind, slug: slugValue } }, update: { data, sortOrder },
    create: { kind, slug: slugValue, sortOrder, data, ...(publishedAt ? { publishedAt } : {}) }
  });
  let i = 0;
  for (const item of json("news")) { const { slug: s, iso, ...data } = item; await put("news", s, i++, { ...data, iso }, new Date(`${iso}T08:00:00+03:00`)); }
  i = 0;
  for (const item of json("laws")) { const { id, ...data } = item; await put("law", id, i++, data); }
  i = 0;
  for (const item of json("faq")) { const { id, ...data } = item; await put("faq", id, i++, data); }
  return { offices, merchants: merchants.length };
}

import { BadRequestException } from '@nestjs/common';
import { COMPLAINT_CATEGORIES, validateRouteB } from '@consumer-rights/contracts';

/** A complaint as the form sends it, checked and cleaned. Offices are resolved later, on the server. */
export interface ComplaintInput {
  category: string; subject: string; narrative: string; urgent: boolean;
  /** `business` sends it to the registered business first (Route B). The other levels go straight to that office (Route A). */
  destination: 'business' | 'woreda' | 'subcity' | 'bureau';
  subcityCode: string | null; woredaNumber: number | null;
  merchantId: string | null; otherBusiness: { name: string; location: string | null; phone: string | null } | null;
  item: string; purchasedOn: Date; paid: number; loss: number | null; receipt: boolean; paymentMethod: string | null;
  want: string; wantAmount: number | null; contactPhone: string | null;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));

export function readComplaint(body: Record<string, unknown>): ComplaintInput {
  const fields: Record<string, string> = {};
  const need = (cond: boolean, key: string, msg: string) => { if (!cond) fields[key] = msg; };

  const category = str(body.category, 60);
  need((COMPLAINT_CATEGORIES as readonly string[]).includes(category), 'category', 'Choose what kind of problem it is.');
  const subject = str(body.subject, 160); need(subject.length >= 5, 'subject', 'Write a short title of at least 5 characters.');
  const narrative = str(body.narrative, 4000); need(narrative.length >= 20, 'narrative', 'Tell us what happened in a few sentences.');
  const destination = str(body.destination, 12) as ComplaintInput['destination'];
  need(['business', 'woreda', 'subcity', 'bureau'].includes(destination), 'destination', 'Choose where to send the complaint.');
  const merchantId = str(body.merchantId, 60) || null;
  const otherName = str(body.otherBusinessName, 160);
  const subcityCode = str(body.subcityCode, 60) || null;
  const woredaNumber = num(body.woreda);
  need(destination !== 'business' || !!merchantId, 'destination', 'Only a registered business can receive a complaint first. Choose an office instead.');
  need(!!merchantId || otherName.length >= 2, 'business', 'Say which business the complaint is about.');
  need(destination !== 'subcity' && destination !== 'woreda' || !!subcityCode, 'subcityCode', 'Choose the Sub-City where you bought it.');
  need(destination !== 'woreda' || (Number.isInteger(woredaNumber) && (woredaNumber as number) >= 1), 'woreda', 'Choose the Woreda where you bought it.');
  const item = str(body.item, 200); need(item.length >= 2, 'item', 'Say what you bought.');
  const purchasedOn = new Date(str(body.purchasedOn, 10));
  need(!Number.isNaN(purchasedOn.getTime()) && purchasedOn.getTime() <= Date.now() + 86_400_000, 'purchasedOn', 'Choose the date you bought it.');
  const paid = num(body.paid); need(paid !== null && Number.isFinite(paid) && paid >= 0 && paid < 1e9, 'paid', 'Write how much you paid.');
  const want = str(body.want, 20); need(['refund', 'replacement', 'repair', 'loss', 'other'].includes(want), 'want', 'Choose what you want.');
  const wantAmount = num(body.wantAmount);
  need(!(want === 'refund' || want === 'loss') || (wantAmount !== null && wantAmount > 0), 'wantAmount', 'Write the amount you ask for.');

  // The shared rules for the two routes (office required for a direct route, merchant for the business route).
  const routeError = destination === 'business'
    ? validateRouteB({ route: 'registered_business', merchantId: merchantId ?? undefined })
    : null;
  if (routeError) fields.destination = routeError;
  if (Object.keys(fields).length) throw new BadRequestException({ code: 'VALIDATION', message: 'Some answers need fixing.', fields });

  return {
    category, subject, narrative, urgent: body.urgent === true, destination, subcityCode, woredaNumber: woredaNumber as number | null,
    merchantId, otherBusiness: merchantId ? null : { name: otherName, location: str(body.otherBusinessPlace, 200) || null, phone: str(body.otherBusinessPhone, 30) || null },
    item, purchasedOn, paid: paid as number, loss: num(body.loss), receipt: body.receipt !== 'no' && body.receipt !== false,
    paymentMethod: str(body.paymentMethod, 40) || null, want, wantAmount, contactPhone: str(body.contactPhone, 30) || null,
  };
}

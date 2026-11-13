import type { GovLevel } from "@/types/gov";

// Free call line logs (prototype/{woreda,subcity,bureau}/calls.html). Demo data: callers are masked and fictional.
export interface CallRow { id: string; time: string; caller: string; about: string; via: string; result: string | null; ref?: string }

export const CALL_INTRO: Record<GovLevel, string> = {
  woreda: "Calls to the free line about your Woreda are passed to you to call back. Calls to your office phone are logged here too.",
  subcity: "Calls to the free line about Akaki Kality are passed to you. Pass them on to the right Woreda, or call back yourself.",
  bureau: "Calls answered by Bureau staff. Callers pay nothing."
};

export const CALL_VIA_HEAD: Record<GovLevel, string> = { woreda: "Came by", subcity: "Came by", bureau: "Taken by" };

export const CALL_RESULTS: Record<GovLevel, string[]> = {
  woreda: ["Advice given", "Made a complaint", "Recorded as a tip", "No answer: try again"],
  subcity: ["Advice given", "Made a complaint", "Recorded as a tip", "Pass it to a Woreda", "No answer: try again"],
  bureau: ["Advice given", "Made a complaint", "Recorded as a tip", "No answer: try again"]
};

export const CALLS: Record<GovLevel, CallRow[]> = {
  woreda: [
    { id: "w1", time: "08:55", caller: "0911 ••• 640", about: "Short weight at Market 097", via: "Free call line", result: "Called back: complaint CC-2026-00146", ref: "CC-2026-00146" },
    { id: "w2", time: "10:30", caller: "0900 ••• 412", about: "Rice complaint: when is the meeting?", via: "Free call line", result: "Called back: advice given" },
    { id: "w3", time: "11:20", caller: "0912 ••• 377", about: "Kiosk selling expired milk", via: "Office phone", result: "Recorded as tip TIP-2026-00049" },
    { id: "w4", time: "12:05", caller: "0944 ••• 158", about: "Shop refused to give a receipt", via: "Free call line", result: null }],
  subcity: [
    { id: "s1", time: "09:05", caller: "0911 ••• 802", about: "Overcharging for cooking oil (Woreda 5)", via: "Free call line", result: "Passed to Woreda 5" },
    { id: "s2", time: "09:40", caller: "0922 ••• 115", about: "Complaint waiting two weeks at Woreda 9", via: "Free call line", result: "Called back: Woreda 9 asked to act" },
    { id: "s3", time: "11:15", caller: "0930 ••• 664", about: "Fake brand detergent (Woreda 11)", via: "Office phone", result: null },
    { id: "s4", time: "13:00", caller: "0911 ••• 640", about: "Short weight at Market 097 (Woreda 7)", via: "Free call line", result: "Passed to Woreda 7" }],
  bureau: [
    { id: "b1", time: "09:12", caller: "0911 ••• 204", about: "Bread sold past its date", via: "Abebech Mulugeta", result: "Complaint CC-2026-00144", ref: "CC-2026-00144" },
    { id: "b2", time: "09:48", caller: "0922 ••• 517", about: "Asking how to complain", via: "Yonas Girma", result: "Advice given" },
    { id: "b3", time: "10:30", caller: "0900 ••• 412", about: "Rice complaint: status", via: "Abebech Mulugeta", result: "Advice given" },
    { id: "b4", time: "11:05", caller: "0933 ••• 090", about: "Sugar sold above the price list", via: "Yonas Girma", result: "Tip TIP-2026-00047" },
    { id: "b5", time: "11:40", caller: "0944 ••• 331", about: "Phone seller kept the money", via: "Not yet answered", result: null },
    { id: "b6", time: "12:15", caller: "0911 ••• 778", about: "Cooking oil, wrong weight", via: "Not yet answered", result: null }]
};

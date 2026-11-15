import { redirect } from "next/navigation";

// The chooser was removed: "Make a complaint" and "Report unfair trade" each have their own button. Old links still work.
export default function ComplaintOrTipPage() { redirect("/complaint/new"); }

import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Display";
import { BIZ_MENU } from "@/features/business/menu";

type Params = { section: string };
const OWNED = BIZ_MENU.flatMap(g => g.items).filter(i => i.owner === "addisb2b");

export const dynamicParams = false;
export function generateStaticParams(): Params[] { return OWNED.map(i => ({ section: i.slug })); }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  return { title: OWNED.find(i => i.slug === section)?.label ?? "Page" };
}

// Stock and prices, orders and the business profile belong to the existing AddisB2B business desk (open question 12).
export default async function AddisB2BOwnedPage({ params }: { params: Promise<Params> }) {
  const { section } = await params;
  const item = OWNED.find(i => i.slug === section);
  if (!item) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>{item.label}</h1></div></div>
      <Alert icon="building" title="This page is part of the AddisB2B business desk">
        <p>Your {item.label.toLowerCase()} are managed in the AddisB2B business desk, not in the consumer protection module. It is listed here so the menu matches the one you already know.</p>
        <p className="mb-0"><Link href="/business/complaints">Go to consumer complaints</Link></p>
      </Alert>
    </>
  );
}

import { freeCallNumber } from "@/lib/config";
import { getFaq, getNews } from "@/lib/content";
import { getReference } from "@/lib/reference";
import { HeroSection } from "@/features/home/HeroSection";
import { DoorsSection, HowSection, RightsSection, FiguresSection } from "@/features/home/InfoSections";
import { NewsSection, FaqSection, HomeDialogs } from "@/features/home/ClosingSections";

export const metadata = { title: "Home" };

// Prototype: public/index.html. News, questions and the Sub-City list come from the database.
export default async function HomePage() {
  const freeCall = freeCallNumber();
  const [news, faq, ref] = await Promise.all([getNews(), getFaq(), getReference()]);
  return (
    <>
      <HeroSection freeCall={freeCall} />
      <DoorsSection />
      <HowSection />
      <RightsSection />
      <FiguresSection />
      <NewsSection items={news} />
      <FaqSection items={faq} />
      <HomeDialogs subcities={ref.subcities.map(s => s.name)} />
    </>
  );
}

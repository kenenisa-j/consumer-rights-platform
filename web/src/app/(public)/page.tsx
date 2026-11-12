import { freeCallNumber } from "@/lib/config";
import { HeroSection } from "@/features/home/HeroSection";
import { DoorsSection, HowSection, RightsSection, FiguresSection } from "@/features/home/InfoSections";
import { NewsSection, FaqSection, TalkSection, HomeDialogs } from "@/features/home/ClosingSections";

export const metadata = { title: "Home" };

// Prototype: public/index.html
export default function HomePage() {
  const freeCall = freeCallNumber();
  return (
    <>
      <HeroSection freeCall={freeCall} />
      <DoorsSection />
      <HowSection />
      <RightsSection />
      <FiguresSection />
      <NewsSection />
      <FaqSection />
      <TalkSection freeCall={freeCall} />
      <HomeDialogs />
    </>
  );
}

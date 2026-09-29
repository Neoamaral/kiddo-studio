import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import TheSpaceSection from "@/components/home/TheSpaceSection";
import ProcessSection from "@/components/home/ProcessSection";
import RecentProjectsSection from "@/components/home/RecentProjectsSection";
import PricingCtaSection from "@/components/home/PricingCtaSection";
import FindUsSection from "@/components/home/FindUsSection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        {/* StudioIntroSection ("THIS IS NOT JUST A STUDIO.") was here and was
            dropped by request; TheSpaceSection moved up into its slot. The
            component file is kept, so putting it back is an import plus a
            line here. */}
        <TheSpaceSection />
        <ServicesSection />
        <ProcessSection />
        <RecentProjectsSection />
        <PricingCtaSection />
        <FindUsSection />
      </main>
      <Footer />
    </>
  );
}

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import StudioIntroSection from "@/components/home/StudioIntroSection";
import ServicesSection from "@/components/home/ServicesSection";
import TheSpaceSection from "@/components/home/TheSpaceSection";
import ProcessSection from "@/components/home/ProcessSection";
import RecentProjectsSection from "@/components/home/RecentProjectsSection";
import PricingCtaSection from "@/components/home/PricingCtaSection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StudioIntroSection />
        <ServicesSection />
        <TheSpaceSection />
        <ProcessSection />
        <RecentProjectsSection />
        <PricingCtaSection />
      </main>
      <Footer />
    </>
  );
}

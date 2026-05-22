import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AboutHeroSection from "@/components/about/AboutHeroSection";
import AboutStorySection from "@/components/about/AboutStorySection";
import AboutValuesSection from "@/components/about/AboutValuesSection";
import AboutNumbersSection from "@/components/about/AboutNumbersSection";
import AboutCtaSection from "@/components/about/AboutCtaSection";

export const metadata = {
  title: "About — Kiddo Studio",
  description: "A creative playground in the heart of Lisbon. Built for filmmakers, photographers, brands, and weirdos.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <AboutHeroSection />
        <AboutStorySection />
        <AboutValuesSection />
        <AboutNumbersSection />
        <AboutCtaSection />
      </main>
      <Footer />
    </>
  );
}

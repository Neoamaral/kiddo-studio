import { getContact, getPricing } from "@/lib/data-source";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import TheSpaceSection from "@/components/home/TheSpaceSection";
import ProcessSection from "@/components/home/ProcessSection";
import PricingCtaSection from "@/components/home/PricingCtaSection";
import FindUsSection from "@/components/home/FindUsSection";

/**
 * Rendered per request, not prerendered.
 *
 * This page reads data the admin panel can change. As a fully static page it
 * was generated once at build and never revalidated — measured: a price saved
 * in the panel had still not appeared 140 seconds later, and neither
 * revalidateTag nor revalidatePath moved it. Only a redeploy did.
 *
 * The cost is small and in the right place: the expensive part, reading the
 * store, stays behind a short-lived cache and is purged on save. What happens
 * per request is React rendering.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pricing, contact] = await Promise.all([getPricing(), getContact()]);
  return (
    <>
      <Header />
      <main>
        <HeroSection coordinates={contact.coordinatesPlain} />
        {/* StudioIntroSection ("THIS IS NOT JUST A STUDIO.") was here and was
            dropped by request; TheSpaceSection moved up into its slot. The
            component file is kept, so putting it back is an import plus a
            line here. */}
        <TheSpaceSection />
        <ServicesSection />
        <ProcessSection />
        {/* RecentProjectsSection (the "NEON ICE x KIDDO STUDIO" portfolio
            strip) sat here and is hidden by request. Same deal: the file
            stays, so it comes back with an import and one line. */}
        <PricingCtaSection rows={pricing.homeRows} />
        <FindUsSection contact={contact} />
      </main>
      <Footer contact={contact} />
    </>
  );
}

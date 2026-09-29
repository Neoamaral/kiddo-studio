import { getCatalogue, getPricing } from "@/lib/data-source";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StudioCoverSection from "@/components/studio/StudioCoverSection";
import StudioRoomsSection from "@/components/studio/StudioRoomsSection";
import StudioFloorplanSection from "@/components/studio/StudioFloorplanSection";
import StudioVisitCTA from "@/components/studio/StudioVisitCTA";

/**
 * Rendered per request, not prerendered.
 *
 * This page reads data the admin panel can change. As a fully static page it
 * was generated once at build and never revalidated — measured: a price saved
 * in the panel had still not appeared 140 seconds later, and neither
 * revalidateTag nor revalidatePath moved it. Only a redeploy did.
 *
 * The cost is small and in the right place: the expensive part, reading the
 * store, stays behind unstable_cache and is purged on save. What happens per
 * request is React rendering.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Space — Kiddo Studio",
  description:
    "Distinct creative spaces in the heart of Lisbon. Cyclorama, black box, creative area, and makeup lounge.",
};

export default async function StudioPage() {
  const pricing = await getPricing();
  return (
    <>
      <Header />
      <main>
        <StudioCoverSection />
        <StudioRoomsSection packages={pricing.packages} />
        <StudioFloorplanSection />
        <StudioVisitCTA />
      </main>
      <Footer />
    </>
  );
}

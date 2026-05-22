import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StudioCoverSection from "@/components/studio/StudioCoverSection";
import StudioRoomsSection from "@/components/studio/StudioRoomsSection";
import StudioFloorplanSection from "@/components/studio/StudioFloorplanSection";
import StudioVisitCTA from "@/components/studio/StudioVisitCTA";

export const metadata = {
  title: "The Space — Kiddo Studio",
  description:
    "Four distinct creative spaces in the heart of Lisbon. Cyclorama, black box, creative area, and prop room.",
};

export default function StudioPage() {
  return (
    <>
      <Header />
      <main>
        <StudioCoverSection />
        <StudioRoomsSection />
        <StudioFloorplanSection />
        <StudioVisitCTA />
      </main>
      <Footer />
    </>
  );
}

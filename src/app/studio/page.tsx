import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = { title: "Studio Space — Kiddo Studio" };

export default function StudioPage() {
  return (
    <>
      <Header />
      <main className="section-cream min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-kiddo-black" style={{ fontSize: "clamp(3rem,8vw,7rem)", lineHeight: 1 }}>
          STUDIO SPACE
        </h1>
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-black/40">
          Page coming soon
        </p>
      </main>
      <Footer />
    </>
  );
}

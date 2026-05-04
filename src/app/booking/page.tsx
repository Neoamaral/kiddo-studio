import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = { title: "Book the Studio — Kiddo Studio" };

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="section-cream min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="font-display text-kiddo-black" style={{ fontSize: "clamp(3rem,8vw,7rem)", lineHeight: 1 }}>
          BOOK THE STUDIO
        </h1>
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-black/40">
          Online scheduling coming soon
        </p>
        <p className="font-body text-sm text-black/50 max-w-sm leading-relaxed mt-2">
          In the meantime, reach out directly via the contact page and we&apos;ll get you booked in.
        </p>
        <a
          href="/contact"
          className="font-mono text-[11px] tracking-[0.15em] uppercase bg-kiddo-lime text-kiddo-black px-6 py-3 mt-4 hover:bg-kiddo-black hover:text-kiddo-lime transition-colors"
        >
          GET IN TOUCH →
        </a>
      </main>
      <Footer />
    </>
  );
}

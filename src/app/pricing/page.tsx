import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PricingPageClient from "@/components/pricing/PricingPageClient";

export const metadata = {
  title: "Pricing — Kiddo Studio",
  description:
    "Simple, transparent pricing. Hourly, half day, full day, or multi-day. No hidden fees.",
};

export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        <PricingPageClient />
      </main>
      <Footer />
    </>
  );
}

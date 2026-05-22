import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EquipmentPageClient from "@/components/equipment/EquipmentPageClient";

export const metadata = { title: "Equipment — Kiddo Studio" };

export default function EquipmentPage() {
  return (
    <>
      <Header />
      <EquipmentPageClient />
      <Footer />
    </>
  );
}

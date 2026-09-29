import { getCatalogue, getContact, getPricing } from "@/lib/data-source";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EquipmentPageClient from "@/components/equipment/EquipmentPageClient";

/**
 * Rendered per request, not prerendered.
 *
 * This page reads data the admin panel can change. As a fully static page it
 * was generated once at build and never revalidated — measured: a price saved
 * in the panel had still not appeared 140 seconds later, and neither
 * revalidateTag nor revalidatePath moved it. Only a redeploy did.
 *
 * The cost is small and in the right place: the expensive part, reading the
 * store, stays behind a short-lived cache and is purged on save. What happens per
 * request is React rendering.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Equipment — Kiddo Studio" };

export default async function EquipmentPage() {
  const [catalogue, contact] = await Promise.all([getCatalogue(), getContact()]);
  return (
    <>
      <Header />
      <EquipmentPageClient catalogue={catalogue} />
      <Footer contact={contact} />
    </>
  );
}

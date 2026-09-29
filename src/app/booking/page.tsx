import BookingPageClient from "@/components/booking/BookingPageClient";
import { getCatalogue, getPricing } from "@/lib/data-source";

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

export const metadata = { title: "Book the Studio — Kiddo Studio" };

export default async function BookingPage() {
  const [pricing, catalogue] = await Promise.all([getPricing(), getCatalogue()]);
  return <BookingPageClient pricing={pricing} catalogue={catalogue} />;
}

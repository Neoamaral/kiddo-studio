/**
 * /cookies was a 404 and a banner cannot link to a 404. One policy, two
 * addresses: the cookie section lives inside the privacy page rather than
 * being a second document that drifts from the first.
 */
import { redirect } from "next/navigation";

export default function CookiesPage() {
  redirect("/privacy#cookies");
}

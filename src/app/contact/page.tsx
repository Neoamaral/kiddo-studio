import { getContact } from "@/lib/data-source";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactSection from "@/components/contact/ContactSection";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact — Kiddo Studio",
  description: "Get in touch. Email, phone, or stop by.",
};

export default async function ContactPage() {
  const contact = await getContact();
  return (
    <>
      <Header />
      <main>
        <ContactSection contact={contact} />
      </main>
      <Footer contact={contact} />
    </>
  );
}

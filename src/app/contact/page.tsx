import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactSection from "@/components/contact/ContactSection";

export const metadata = {
  title: "Contact — Kiddo Studio",
  description: "Get in touch. Email, phone, or stop by.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

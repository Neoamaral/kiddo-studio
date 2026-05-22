import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProjectsPageClient from "@/components/projects/ProjectsPageClient";

export const metadata = {
  title: "Projects — Kiddo Studio",
  description: "Our work. Fashion, film, commercial, beauty. Shot at Kiddo Studio, Lisbon.",
};

export default function ProjectsPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectsPageClient />
      </main>
      <Footer />
    </>
  );
}

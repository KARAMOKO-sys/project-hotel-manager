import type { Metadata } from "next";
import Navbar from "@/app/shared/components/Navbar";
import Footer from "@/app/shared/components/layouts/Footer";
import PropertyDetail from "@/app/property/components/PropertyDetail";

export const metadata: Metadata = {
  title: "Détail du bien | Makaan",
  description: "Informations détaillées sur ce bien immobilier.",
};

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="bg-white">
      <Navbar />
      <PropertyDetail id={id} />
      <Footer />
    </div>
  );
}

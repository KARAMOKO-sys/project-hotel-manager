import type { Metadata } from "next";
import Navbar from "@/app/shared/components/Navbar";
import Footer from "@/app/shared/components/layouts/Footer";
import PropertyList from "@/app/home/components/PropertyList";
import Search from "@/app/shared/components/Search";
import { PROPERTY_TYPES } from "@/types";
import type { PropertyFilter, PropertyType } from "@/types";

export const metadata: Metadata = {
  title: "Propriétés | Makaan",
  description: "Parcourez nos hôtels, résidences et logements.",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;

  // Construit le filtre initial depuis l'URL.
  const filter: PropertyFilter = {
    search: text(params.search),
    city: text(params.city),
    type: PROPERTY_TYPES.includes(params.type as PropertyType)
      ? (params.type as PropertyType)
      : undefined,
  };

  return (
    <div className="bg-white">
      <Navbar />
      <Search initialValues={filter} />
      <PropertyList
        key={JSON.stringify(filter)}
        initialFilter={filter}
        pageSize={9}
        paginated
      />
      <Footer />
    </div>
  );
}

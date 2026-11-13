"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Category from "./components/Category";
import AboutHome from "./components/AboutHome";
import PropertyList from "./components/PropertyList";
import CallToAction from "./components/CallToAction";
import Team from "./components/Team";
import Testimonial from "./components/Testimonial";
import { useSiteConfig } from "@/app/shared/contexts/SiteConfigContext";

export default function HomePage() {
  const { config, error } = useSiteConfig();

  return (
    <div className="bg-white">
      {error && (
        <p className="site-config-warning" role="status">
          Le site utilise son thème par défaut, car sa configuration n’a pas pu
          être chargée.
        </p>
      )}
      {config.sections.categories && <Category />}
      {config.sections.about && <AboutHome />}
      {config.sections.properties && <PropertyList />}
      {config.sections.callToAction && <CallToAction />}
      {config.sections.team && <Team />}
      {config.sections.testimonials && <Testimonial />}
    </div>
  );
}

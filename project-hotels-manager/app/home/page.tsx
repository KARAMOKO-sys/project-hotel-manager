"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Category from "./components/Category";
import AboutHome from "./components/AboutHome";
import PropertyList from "./components/PropertyList";
import CallToAction from "./components/CallToAction";
import Team from "./components/Team";
import Testimonial from "./components/Testimonial";

export default function HomePage() {
  return (
    <div className="bg-white">
      <Category />
      <AboutHome />
      <PropertyList />
      <CallToAction />
      <Team />
      <Testimonial />
    </div>
  );
}

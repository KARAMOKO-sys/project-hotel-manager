"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "../shared/components/Navbar";
import Footer from "../shared/components/layouts/Footer";
import AboutHeader from "./components/AboutHeader";
import About from "./components/About";
import Search from "../shared/components/Search";
import CallToAction from "./components/CallToAction";
import Team from "../home/components/Team";

export default function AboutPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <AboutHeader />
      <Search />
      <About />
      <CallToAction />
      <Team />
      <Footer />
    </div>
  );
}

"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "../shared/components/Navbar";
import Footer from "../shared/components/layouts/Footer";
import ContactHeader from "./components/ContactHeader";
import Search from "../shared/components/Search";
import Contact from "./components/Contact";

export default function AboutPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <ContactHeader />
      <Search />
      <Contact />
      <Footer />
    </div>
  );
}

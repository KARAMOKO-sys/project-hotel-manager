"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "../shared/components/Navbar";
import Footer from "../shared/components/layouts/Footer";
import Testimonial from "../home/components/Testimonial";

export default function TestimonialPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <Testimonial />
      <Footer />
    </div>
  );
}

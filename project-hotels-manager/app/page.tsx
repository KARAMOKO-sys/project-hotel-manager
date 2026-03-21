"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Footer from "./shared/components/layouts/Footer";
import Header from "./shared/components/layouts/Header";

import Navbar from "./shared/components/Navbar";
import Search from "./shared/components/Search";
import HomePage from "./home/page";

export default function Home() {
  return (
    <div className="bg-white">
      <Navbar />
      <Header />
      <Search />
      <HomePage />
      <Footer />
    </div>
  );
}

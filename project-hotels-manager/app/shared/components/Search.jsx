"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Search() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [propertyType, setPropertyType] = useState(null);
  const [location, setLocation] = useState(null);

  const propertyTypes = [
    { label: "Property Type", value: null },
    { label: "Apartment", value: "apartment" },
    { label: "House", value: "house" },
    { label: "Villa", value: "villa" },
    { label: "Commercial", value: "commercial" },
    { label: "Land", value: "land" },
  ];

  const locations = [
    { label: "Location", value: null },
    { label: "New York", value: "new-york" },
    { label: "Los Angeles", value: "los-angeles" },
    { label: "Chicago", value: "chicago" },
    { label: "Houston", value: "houston" },
    { label: "Phoenix", value: "phoenix" },
  ];

  const handleSearch = () => {
    console.log("Searching:", { searchKeyword, propertyType, location });
  };

  return (
    <div
      className="search-section"
      style={{ background: "var(--primary-color)", padding: "60px 0" }}
    >
      <div className="container">
        <div className="search-wrapper">
          <div className="row g-3">
            <div className="col-md-4">
              <InputText
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search Keyword"
                className="w-100 search-input"
                style={{
                  background: "white",
                  height: "55px",
                  border: "none",
                  padding: "0 20px",
                  borderRadius: "10px",
                }}
              />
            </div>
            <div className="col-md-3">
              <Dropdown
                value={propertyType}
                onChange={(e) => setPropertyType(e.value)}
                options={propertyTypes}
                optionLabel="label"
                placeholder="Property Type"
                className="w-100 search-dropdown"
                style={{
                  background: "white",
                  height: "55px",
                  borderRadius: "10px",
                }}
              />
            </div>
            <div className="col-md-3">
              <Dropdown
                value={location}
                onChange={(e) => setLocation(e.value)}
                options={locations}
                optionLabel="label"
                placeholder="Location"
                className="w-100 search-dropdown"
                style={{
                  background: "white",
                  height: "55px",
                  borderRadius: "10px",
                }}
              />
            </div>
            <div className="col-md-2">
              <Button
                label="Search"
                icon="pi pi-search"
                onClick={handleSearch}
                className="search-button w-100"
                style={{
                  height: "55px",
                  background: "#1f2937",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-color-hover: #16a34a;
        }

        .search-section {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          position: relative;
          margin-top: -30px;
          z-index: 10;
          border-radius: 0 0 20px 20px;
        }

        .search-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        .search-input,
        .search-dropdown {
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .search-input:focus,
        .search-dropdown:focus-within {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .p-inputtext:enabled:focus,
        .p-dropdown:not(.p-disabled).p-focus {
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
          border-color: var(--primary-color);
        }

        .p-dropdown-panel .p-dropdown-items .p-dropdown-item.p-highlight {
          background: rgba(34, 197, 94, 0.1);
          color: var(--primary-color);
        }

        .p-dropdown .p-dropdown-label {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .search-button {
          background: #1f2937 !important;
          border: none !important;
          transition: all 0.3s ease;
        }

        .search-button:hover {
          background: #111827 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .search-section {
            margin-top: -20px;
            padding: 40px 0 !important;
          }

          .search-section .container {
            padding: 0 20px;
          }
        }
      `}</style>
    </div>
  );
}

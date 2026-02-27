// src/app/page.tsx
"use client";

import { useSpinner } from "./shared/contexts/SpinnerContext";

export default function Home() {
  const { showSpinner, hideSpinner } = useSpinner();

  return (
    <main className="container mt-5">
      <h1>Ma Page</h1>
    </main>
  );
}

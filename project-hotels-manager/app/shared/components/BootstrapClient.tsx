"use client";

import { useEffect } from "react";

/** Charge le JS de Bootstrap (dropdowns, collapse…) côté navigateur uniquement. */
export default function BootstrapClient() {
  useEffect(() => {
    // @ts-expect-error — module JS sans déclarations de types.
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}

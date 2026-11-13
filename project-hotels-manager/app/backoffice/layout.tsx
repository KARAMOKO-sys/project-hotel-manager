import type { ReactNode } from "react";
import BackofficeShell from "./shell";

export default function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <BackofficeShell>{children}</BackofficeShell>;
}

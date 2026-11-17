// app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layouts/Sidebar";
import AdminHeader from "@/components/layouts/AdminHeader";
import "./styles/admin.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const redirectToLogin = () => router.replace("/login");
    window.addEventListener("auth:unauthorized", redirectToLogin);
    return () => window.removeEventListener("auth:unauthorized", redirectToLogin);
  }, [router]);

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuPath === pathname}
        onClose={() => setMobileMenuPath(null)}
      />
      <div className={`admin-main ${sidebarCollapsed ? "expanded" : ""}`}>
        <AdminHeader
          onMenuToggle={() =>
            setMobileMenuPath((current) =>
              current === pathname ? null : pathname,
            )
          }
        />
        <main className="admin-body">{children}</main>
      </div>
    </div>
  );
}

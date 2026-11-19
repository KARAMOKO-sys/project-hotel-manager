// app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layouts/Sidebar";
import AdminHeader from "@/components/layouts/AdminHeader";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { WorkspaceProvider } from "@/lib/workspace";
import { useTheme } from "@/lib/theme";
import "./styles/admin.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  // null : l'utilisateur n'a pas encore choisi, on suit le thème.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const sidebarCollapsed = userCollapsed ?? theme.sidebarCollapsedByDefault;
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const redirectToLogin = () => router.replace("/login");
    window.addEventListener("auth:unauthorized", redirectToLogin);
    return () => window.removeEventListener("auth:unauthorized", redirectToLogin);
  }, [router]);

  return (
    <WorkspaceProvider>
      <FeedbackProvider>
        <div className="admin-layout">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setUserCollapsed(!sidebarCollapsed)}
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
      </FeedbackProvider>
    </WorkspaceProvider>
  );
}

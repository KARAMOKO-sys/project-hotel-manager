// src/components/layouts/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCES } from "@/lib/resources";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const menuItems = [
    {
      name: "Tableau de bord",
      icon: "pi pi-home",
      href: "/admin/dashboard",
      key: "dashboard",
    },
    ...RESOURCES.map((resource) => ({
      name: resource.title,
      icon: resource.icon,
      href: `/admin/${resource.key}`,
      key: resource.key,
    })),
  ];

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Fermer le menu"
        />
      )}
      <aside
        className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        {/* Logo Section */}
        <div className="sidebar-header">
          <Link href="/admin/dashboard" className="sidebar-brand">
            <div className="brand-icon">
              <i className="pi pi-building"></i>
            </div>
            {!collapsed && (
              <div className="brand-text">
                <h3 className="mb-0">PleasantStay</h3>
                <span className="brand-subtitle">Hotel Admin</span>
              </div>
            )}
          </Link>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
          >
            <i
              className={`pi ${collapsed ? "pi-angle-double-right" : "pi-angle-double-left"}`}
            ></i>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-link-item ${pathname === item.href || (item.key !== "dashboard" && pathname.startsWith(`${item.href}/`)) ? "active" : ""}`}
              onClick={onClose}
              title={collapsed ? item.name : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <div className="nav-icon-wrapper">
                <i className={`${item.icon} nav-icon`}></i>
                {(pathname === item.href ||
                  (item.key !== "dashboard" &&
                    pathname.startsWith(`${item.href}/`))) && (
                  <span className="nav-active-dot"></span>
                )}
              </div>
              {!collapsed && <span className="nav-label">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer Section */}
        {!collapsed && (
          <div className="sidebar-footer">
            <div className="footer-card">
              <i className="pi pi-question-circle footer-icon"></i>
              <div>
                <p className="mb-0 small fw-semibold">Need Help?</p>
                <p className="mb-0 small text-muted">Contact support</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <style jsx global>{`
        .admin-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(34, 197, 94, 0.1);
        }

        .admin-sidebar.collapsed {
          width: 80px;
        }

        /* Sidebar Header */
        .sidebar-header {
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid rgba(34, 197, 94, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .brand-icon {
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.2);
        }

        .brand-icon i {
          color: white;
          font-size: 1.2rem;
        }

        .brand-img {
          width: 28px;
          height: 28px;
          filter: brightness(0) invert(1);
        }

        .brand-text h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #22c55e;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 0.7rem;
          color: #6c757d;
          letter-spacing: 0.5px;
        }

        .sidebar-toggle {
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #22c55e;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .sidebar-toggle:hover {
          background: #22c55e;
          color: white;
          border-color: #22c55e;
          transform: scale(1.05);
        }

        /* User Profile */
        .sidebar-user {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(34, 197, 94, 0.1);
          background: rgba(34, 197, 94, 0.02);
        }

        .user-avatar {
          position: relative;
        }

        .avatar-img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #22c55e;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        .online-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid white;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
        }

        .user-role {
          font-size: 0.7rem;
          color: #6c757d;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-link-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          color: #6c757d;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link-item:hover {
          background: rgba(34, 197, 94, 0.08);
          color: #22c55e;
          transform: translateX(5px);
        }

        .nav-link-item.active {
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.1) 0%,
            rgba(34, 197, 94, 0.05) 100%
          );
          color: #22c55e;
          border-right: 3px solid #22c55e;
        }

        .nav-icon-wrapper {
          position: relative;
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-icon {
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }

        .nav-active-dot {
          position: absolute;
          right: -8px;
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .nav-label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        /* Footer */
        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(34, 197, 94, 0.1);
        }

        .footer-card {
          background: rgba(34, 197, 94, 0.05);
          border-radius: 12px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .footer-card:hover {
          background: rgba(34, 197, 94, 0.1);
          transform: translateY(-2px);
        }

        .footer-icon {
          font-size: 1.2rem;
          color: #22c55e;
          background: white;
          padding: 0.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        /* Collapsed Styles */
        .admin-sidebar.collapsed .sidebar-header {
          justify-content: center;
          padding: 1.5rem 0.5rem;
        }

        .admin-sidebar.collapsed .sidebar-toggle {
          position: absolute;
          right: -16px;
          top: 50%;
          transform: translateY(-50%);
        }

        .admin-sidebar.collapsed .nav-link-item {
          justify-content: center;
          padding: 0.75rem;
        }

        .admin-sidebar.collapsed .nav-icon-wrapper {
          width: auto;
        }

        .admin-sidebar.collapsed .nav-label {
          display: none;
        }

        /* Animations */
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        /* Responsive */
        .sidebar-backdrop {
          display: none;
        }

        @media (max-width: 992px) {
          .admin-sidebar {
            transform: translateX(-100%);
            width: min(300px, calc(100vw - 48px));
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
          }

          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }

          .admin-sidebar.collapsed {
            width: min(300px, calc(100vw - 48px));
          }

          .admin-sidebar.collapsed .sidebar-header {
            justify-content: space-between;
            padding: 1.5rem 1.25rem;
          }

          .admin-sidebar.collapsed .sidebar-toggle {
            position: static;
            transform: none;
          }

          .admin-sidebar.collapsed .nav-link-item {
            justify-content: flex-start;
            padding: 0.75rem 1rem;
          }

          .admin-sidebar.collapsed .nav-label {
            display: inline;
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 999;
            border: 0;
            background: rgba(15, 23, 42, 0.42);
          }
        }
      `}</style>
    </>
  );
}

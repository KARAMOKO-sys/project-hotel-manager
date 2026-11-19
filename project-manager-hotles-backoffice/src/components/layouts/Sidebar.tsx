// src/components/layouts/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOTEL_GROUP, RESOURCES } from "@/lib/resources";
import { EXTRA_PAGES, MENU_GROUPS } from "@/lib/erp-resources";
import { useWorkspace } from "@/lib/workspace";
import { useTheme } from "@/lib/theme";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface MenuItem {
  name: string;
  icon: string;
  href: string;
  key: string;
}

interface MenuSection {
  label: string;
  icon: string;
  items: MenuItem[];
}

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
  const { isAppInstalled } = useWorkspace();
  const { theme } = useTheme();
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  const isActive = (item: MenuItem) =>
    pathname === item.href ||
    (item.key !== "dashboard" && pathname.startsWith(`${item.href}/`));

  const generalItems: MenuItem[] = [
    {
      name: "Tableau de bord",
      icon: "pi pi-home",
      href: "/admin/dashboard",
      key: "dashboard",
    },
    {
      name: "Applications",
      icon: "pi pi-th-large",
      href: "/admin/apps",
      key: "apps",
    },
    {
      name: "Apparence",
      icon: "pi pi-palette",
      href: "/admin/appearance",
      key: "appearance",
    },
    ...(isAppInstalled("activity")
      ? [
          {
            name: "Mes activités",
            icon: "pi pi-check-circle",
            href: "/admin/my-activities",
            key: "my-activities",
          },
        ]
      : []),
  ];

  // Ressources et pages dédiées regroupées par section, en masquant les
  // applications non installées pour l'établissement courant.
  const groupItems = new Map<string, MenuItem[]>();
  const pushItem = (group: string, item: MenuItem) => {
    groupItems.set(group, [...(groupItems.get(group) ?? []), item]);
  };
  RESOURCES.forEach((resource) => {
    if (!isAppInstalled(resource.app)) return;
    pushItem(resource.group ?? HOTEL_GROUP, {
      name: resource.title,
      icon: resource.icon,
      href: `/admin/${resource.key}`,
      key: resource.key,
    });
  });
  EXTRA_PAGES.forEach((page) => {
    if (!isAppInstalled(page.app)) return;
    pushItem(page.group, {
      name: page.title,
      icon: page.icon,
      href: `/admin/${page.key}`,
      key: page.key,
    });
  });
  const knownGroups = MENU_GROUPS.map((group) => group.label);
  const sections: MenuSection[] = [
    ...MENU_GROUPS.map((group) => ({
      label: group.label,
      icon: group.icon,
      items: groupItems.get(group.label) ?? [],
    })),
    ...[...groupItems.keys()]
      .filter((label) => !knownGroups.includes(label))
      .map((label) => ({
        label,
        icon: "pi pi-folder",
        items: groupItems.get(label) ?? [],
      })),
  ].filter((section) => section.items.length > 0);

  const toggleGroup = (label: string) =>
    setClosedGroups((current) => ({ ...current, [label]: !current[label] }));

  const renderItem = (item: MenuItem) => {
    const active = isActive(item);
    return (
      <Link
        key={item.key}
        href={item.href}
        className={`nav-link-item ${active ? "active" : ""}`}
        onClick={onClose}
        title={collapsed ? item.name : undefined}
        aria-current={pathname === item.href ? "page" : undefined}
      >
        <div className="nav-icon-wrapper">
          <i className={`${item.icon} nav-icon`}></i>
          {active && <span className="nav-active-dot"></span>}
        </div>
        {!collapsed && <span className="nav-label">{item.name}</span>}
      </Link>
    );
  };

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
              {theme.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.logoUrl} alt="" className="brand-logo" />
              ) : (
                <i className="pi pi-building"></i>
              )}
            </div>
            {!collapsed && (
              <div className="brand-text">
                <h3 className="mb-0">{theme.appName}</h3>
                <span className="brand-subtitle">{theme.appSubtitle}</span>
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
          {generalItems.map(renderItem)}
          {sections.map((section) => {
            const containsActive = section.items.some(isActive);
            const open = collapsed || containsActive || !closedGroups[section.label];
            return (
              <div className="nav-section" key={section.label}>
                {collapsed ? (
                  <div className="nav-section-divider" title={section.label}></div>
                ) : (
                  <button
                    type="button"
                    className="nav-section-toggle"
                    onClick={() => toggleGroup(section.label)}
                    aria-expanded={open}
                  >
                    <i className={`${section.icon} nav-section-icon`}></i>
                    <span>{section.label}</span>
                    <i
                      className={`pi ${open ? "pi-chevron-down" : "pi-chevron-right"} nav-section-chevron`}
                    ></i>
                  </button>
                )}
                {open && (
                  <div className="nav-section-items">{section.items.map(renderItem)}</div>
                )}
              </div>
            );
          })}
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
          background: var(--ps-sidebar-bg);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(var(--ps-primary-rgb), 0.1);
        }

        .admin-sidebar.collapsed {
          width: 80px;
        }

        /* Sidebar Header */
        .sidebar-header {
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid rgba(var(--ps-primary-rgb), 0.1);
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
          background: linear-gradient(135deg, var(--ps-primary) 0%, var(--ps-primary-hover) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 15px rgba(var(--ps-primary-rgb), 0.2);
        }

        .brand-icon i {
          color: white;
          font-size: 1.2rem;
        }

        .brand-logo {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
        }

        .brand-img {
          width: 28px;
          height: 28px;
          filter: brightness(0) invert(1);
        }

        .brand-text h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--ps-primary);
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 0.7rem;
          color: var(--ps-sidebar-muted);
          letter-spacing: 0.5px;
        }

        .sidebar-toggle {
          background: white;
          border: 1px solid rgba(var(--ps-primary-rgb), 0.2);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--ps-primary);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .sidebar-toggle:hover {
          background: var(--ps-primary);
          color: white;
          border-color: var(--ps-primary);
          transform: scale(1.05);
        }

        /* User Profile */
        .sidebar-user {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(var(--ps-primary-rgb), 0.1);
          background: rgba(var(--ps-primary-rgb), 0.02);
        }

        .user-avatar {
          position: relative;
        }

        .avatar-img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--ps-primary);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        .online-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: var(--ps-primary);
          border-radius: 50%;
          border: 2px solid white;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--ps-sidebar-text);
        }

        .user-role {
          font-size: 0.7rem;
          color: var(--ps-sidebar-muted);
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
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
          color: var(--ps-sidebar-muted);
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link-item:hover {
          background: rgba(var(--ps-primary-rgb), 0.08);
          color: var(--ps-primary);
          transform: translateX(5px);
        }

        .nav-link-item.active {
          background: linear-gradient(
            135deg,
            rgba(var(--ps-primary-rgb), 0.1) 0%,
            rgba(var(--ps-primary-rgb), 0.05) 100%
          );
          color: var(--ps-primary);
          border-right: 3px solid var(--ps-primary);
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
          background: var(--ps-primary);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.35rem;
        }

        .nav-section-toggle {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          width: 100%;
          padding: 0.55rem 0.75rem 0.35rem;
          border: 0;
          background: transparent;
          color: var(--ps-sidebar-muted);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: left;
          cursor: pointer;
        }

        .nav-section-toggle:hover {
          color: var(--ps-primary-hover);
        }

        .nav-section-toggle span {
          flex: 1;
        }

        .nav-section-icon {
          font-size: 0.8rem;
        }

        .nav-section-chevron {
          font-size: 0.65rem;
        }

        .nav-section-items {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .nav-section-divider {
          height: 1px;
          margin: 0.4rem 0.75rem;
          background: rgba(var(--ps-primary-rgb), 0.18);
        }

        .nav-label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        /* Footer */
        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(var(--ps-primary-rgb), 0.1);
        }

        .footer-card {
          background: rgba(var(--ps-primary-rgb), 0.05);
          border-radius: 12px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }

        .footer-card:hover {
          background: rgba(var(--ps-primary-rgb), 0.1);
          transform: translateY(-2px);
        }

        .footer-icon {
          font-size: 1.2rem;
          color: var(--ps-primary);
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

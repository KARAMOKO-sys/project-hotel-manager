"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as authService from "@/services/api/auth.service";
import { tokenStorage } from "@/services/api/client";
import { BACKOFFICE_GROUPS, BACKOFFICE_RESOURCES } from "./resources";

interface CurrentUser {
  full_name: string;
  email: string;
  user_type: string;
}

export default function BackofficeShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/backoffice/login";
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isLogin);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isLogin) {
      setLoading(false);
      return;
    }
    let active = true;
    authService
      .me()
      .then((profile) => {
        if (active) {
          setUser(profile);
          setAuthError(null);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
            ? error.status
            : undefined;
        if (status === 401 || status === 403) {
          tokenStorage.clear();
          router.replace("/backoffice/login");
          return;
        }
        setAuthError(
          error instanceof Error
            ? error.message
            : "Impossible de vérifier la session.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <main className="bo-auth-state">
        <span className="bo-loader" aria-hidden="true" />
        <p>Vérification de votre session…</p>
      </main>
    );
  }

  if (authError || !user) {
    return (
      <main className="bo-auth-state">
        <h1>Connexion au backoffice impossible</h1>
        <p>{authError ?? "Aucune session active."}</p>
        <button
          className="bo-button bo-button-primary"
          onClick={() => router.replace("/backoffice/login")}
        >
          Retour à la connexion
        </button>
      </main>
    );
  }

  return (
    <div className="bo-layout">
      {menuOpen && (
        <button
          aria-label="Fermer le menu"
          className="bo-sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`bo-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link
          href="/backoffice"
          className="bo-brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="bo-brand-mark">P</span>
          <span>
            <strong>PleasantStay</strong>
            <small>Gestion hôtelière</small>
          </span>
        </Link>
        <nav aria-label="Navigation du backoffice" className="bo-nav">
          <Link
            href="/backoffice"
            className={`bo-nav-link ${pathname === "/backoffice" ? "is-active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <i className="pi pi-chart-bar" aria-hidden="true" />
            Vue d’ensemble
          </Link>
          {BACKOFFICE_GROUPS.map((group) => {
            const resources = BACKOFFICE_RESOURCES.filter(
              (resource) => resource.group === group,
            );
            if (!resources.length) return null;
            return (
              <section className="bo-nav-group" key={group}>
                <h2>{group}</h2>
                {resources.map((resource) => (
                  <Link
                    className={`bo-nav-link ${pathname === `/backoffice/${resource.id}` ? "is-active" : ""}`}
                    href={`/backoffice/${resource.id}`}
                    key={resource.id}
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className="pi pi-circle-fill bo-nav-dot" aria-hidden="true" />
                    {resource.label}
                  </Link>
                ))}
              </section>
            );
          })}
          <section className="bo-nav-group">
            <h2>Site public</h2>
            <Link
              className={`bo-nav-link ${pathname === "/backoffice/site" ? "is-active" : ""}`}
              href="/backoffice/site"
              onClick={() => setMenuOpen(false)}
            >
              <i className="pi pi-palette" aria-hidden="true" />
              Personnalisation
            </Link>
          </section>
        </nav>
        <div className="bo-sidebar-footer">
          <span className="bo-avatar">
            {(user.full_name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="bo-user-info">
            <strong>{user.full_name || user.email}</strong>
            <small>{user.user_type.replaceAll("_", " ")}</small>
          </span>
          <button
            aria-label="Se déconnecter"
            className="bo-icon-button"
            onClick={async () => {
              try {
                await authService.logout();
              } finally {
                tokenStorage.clear();
                router.replace("/backoffice/login");
              }
            }}
            title="Se déconnecter"
          >
            <i className="pi pi-sign-out" aria-hidden="true" />
          </button>
        </div>
      </aside>
      <div className="bo-main">
        <header className="bo-topbar">
          <button
            aria-label="Ouvrir le menu"
            className="bo-icon-button bo-menu-toggle"
            onClick={() => setMenuOpen(true)}
          >
            <i className="pi pi-bars" aria-hidden="true" />
          </button>
          <span className="bo-breadcrumb">Backoffice / {pathname.split("/").at(-1)}</span>
          <Link className="bo-public-link" href="/">
            <i className="pi pi-external-link" aria-hidden="true" />
            Voir le site
          </Link>
        </header>
        <main className="bo-content">{children}</main>
      </div>
    </div>
  );
}

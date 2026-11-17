"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearAuthSession, getAuthUser } from "@/lib/api";
import { APP_NAME } from "@/lib/config";
import { RESOURCES } from "@/lib/resources";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

function displayValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setUser(getAuthUser()), 0);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const currentResource = RESOURCES.find(
    (resource) => pathname === `/admin/${resource.key}`,
  );
  const title =
    currentResource?.title ??
    (pathname === "/admin/dashboard" ? "Tableau de bord" : APP_NAME);
  const firstName = displayValue(user?.first_name);
  const lastName = displayValue(user?.last_name);
  const email = displayValue(user?.email);
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const role = displayValue(user?.user_type) || "Compte connecté";

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const normalized = query.toLocaleLowerCase("fr");
    const resource =
      RESOURCES.find(
        (item) =>
          item.title.toLocaleLowerCase("fr").includes(normalized) ||
          item.key.toLocaleLowerCase("fr").includes(normalized),
      ) ??
      currentResource ??
      RESOURCES.find((item) => item.key === "properties");

    if (!resource) return;
    router.push(`/admin/${resource.key}?search=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      clearAuthSession();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "La déconnexion a échoué",
      );
    }
  };

  return (
    <header className={`admin-header ${isScrolled ? "scrolled" : ""}`}>
      <div className="header-content">
        <div className="header-left">
          <button
            className="mobile-menu-btn"
            onClick={onMenuToggle}
            aria-label="Ouvrir le menu"
            aria-haspopup="true"
          >
            <i className="pi pi-bars"></i>
          </button>
          <div className="page-title">
            <h1>{title}</h1>
            <p>Gestion hôtelière · PleasantStay</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="header-search">
          <i className="pi pi-search" aria-hidden="true"></i>
          <input
            type="search"
            aria-label="Rechercher dans le backoffice"
            placeholder="Rechercher une ressource…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit" aria-label="Lancer la recherche">
            <i className="pi pi-arrow-right"></i>
          </button>
        </form>

        <div className="header-account">
          <div className="account-avatar" aria-hidden="true">
            {(name || "A").slice(0, 1).toLocaleUpperCase("fr")}
          </div>
          <div className="account-details">
            <strong>{name || "Administrateur"}</strong>
            <span>{role}</span>
          </div>
          <button
            className="logout-btn"
            onClick={() => void handleLogout()}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <i className="pi pi-sign-out"></i>
            <span>Quitter</span>
          </button>
        </div>
      </div>
      {logoutError && (
        <p className="header-error" role="alert">
          {logoutError}
        </p>
      )}

      <style jsx global>{`
        .admin-header {
          position: fixed;
          z-index: 990;
          top: 0;
          right: 0;
          left: 280px;
          min-height: 80px;
          padding: 0 1.5rem;
          border-bottom: 1px solid #e8eee9;
          background: rgb(255 255 255 / 0.94);
          backdrop-filter: blur(16px);
          transition:
            left 0.25s ease,
            box-shadow 0.25s ease;
        }

        .admin-header.scrolled {
          box-shadow: 0 8px 28px rgb(15 23 42 / 0.08);
        }

        .admin-main.expanded .admin-header {
          left: 80px;
        }

        .header-content {
          display: grid;
          min-height: 79px;
          grid-template-columns: minmax(180px, 1fr) minmax(220px, 420px) auto;
          align-items: center;
          gap: 1.25rem;
        }

        .header-left,
        .header-account {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 0.85rem;
        }

        .mobile-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          color: #15803d;
          font-size: 1rem;
        }

        .page-title {
          min-width: 0;
        }

        .page-title h1 {
          overflow: hidden;
          margin: 0;
          color: #17211b;
          font-size: 1.12rem;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .page-title p {
          margin: 0.2rem 0 0;
          color: #748078;
          font-size: 0.76rem;
        }

        .header-search {
          display: flex;
          height: 42px;
          align-items: center;
          gap: 0.6rem;
          padding: 0 0.4rem 0 0.9rem;
          border: 1px solid #e5eae6;
          border-radius: 12px;
          background: #f8faf8;
          color: #849087;
        }

        .header-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #17211b;
          font-size: 0.84rem;
        }

        .header-search input::placeholder {
          color: #929d95;
        }

        .header-search button {
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: #16844a;
          color: #fff;
        }

        .header-account {
          justify-content: flex-end;
        }

        .account-avatar {
          display: grid;
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 13px;
          background: #e9f5ec;
          color: #16844a;
          font-size: 1rem;
          font-weight: 700;
        }

        .account-details {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .account-details strong {
          max-width: 170px;
          overflow: hidden;
          color: #25332a;
          font-size: 0.8rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .account-details span {
          color: #7a857d;
          font-size: 0.7rem;
          text-transform: capitalize;
        }

        .logout-btn {
          display: inline-flex;
          height: 38px;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.75rem;
          border: 1px solid #e5eae6;
          border-radius: 11px;
          background: #fff;
          color: #647067;
          font-size: 0.8rem;
        }

        .logout-btn:hover {
          border-color: #fca5a5;
          color: #b91c1c;
        }

        .header-error {
          position: absolute;
          top: calc(100% + 0.4rem);
          right: 1rem;
          margin: 0;
          padding: 0.6rem 0.8rem;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 0.8rem;
          box-shadow: 0 8px 24px rgb(15 23 42 / 0.1);
        }

        @media (max-width: 992px) {
          .admin-header,
          .admin-main.expanded .admin-header {
            left: 0;
          }

          .mobile-menu-btn {
            display: grid;
            place-items: center;
          }
        }

        @media (max-width: 760px) {
          .admin-header {
            padding: 0 0.8rem;
          }

          .header-content {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 0.65rem;
          }

          .header-search {
            display: none;
          }

          .header-account {
            gap: 0.5rem;
          }

          .account-avatar {
            width: 36px;
            height: 36px;
          }

          .account-details {
            display: none;
          }

          .logout-btn {
            width: 38px;
            justify-content: center;
            padding: 0;
          }

          .logout-btn span {
            display: none;
          }

          .page-title h1 {
            font-size: 1rem;
          }

          .page-title p {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}

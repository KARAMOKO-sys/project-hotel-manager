// app/admin/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, Doughnut } from "react-chartjs-2";
import "@/lib/charts";
import { api } from "@/lib/api";
import { DEMO_MODE } from "@/lib/config";
import { getMockCounts, getMockList } from "@/lib/mock";
import type { Entity, Reservation, Room } from "@/lib/types";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface CountCard {
  key: string;
  label: string;
  icon: string;
}

const COUNT_CARDS: CountCard[] = [
  { key: "organizations", label: "Établissements", icon: "pi pi-sitemap" },
  { key: "properties", label: "Propriétés", icon: "pi pi-building" },
  { key: "rooms", label: "Chambres", icon: "pi pi-home" },
  { key: "guests", label: "Clients", icon: "pi pi-users" },
  { key: "reservations", label: "Réservations", icon: "pi pi-calendar" },
  { key: "invoices", label: "Factures", icon: "pi pi-file" },
];

const COUNT_ENDPOINTS: Record<string, string> = {
  organizations: "/organizations",
  properties: "/properties",
  rooms: "/rooms",
  guests: "/guests",
  reservations: "/reservations",
  invoices: "/invoices",
};

const ROOM_STATUS_COLORS: Record<string, string> = {
  clean: "#22c55e",
  occupied: "#3b82f6",
  dirty: "#f59e0b",
  inspection: "#a855f7",
  maintenance: "#ef4444",
  blocked: "#6b7280",
};

const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  checked_in: "#22c55e",
  checked_out: "#16a34a",
  cancelled: "#ef4444",
  no_show: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  clean: "Propre",
  occupied: "Occupée",
  dirty: "À nettoyer",
  inspection: "Inspection",
  maintenance: "Maintenance",
  blocked: "Bloquée",
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Annulée",
  no_show: "No-show",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const [countResults, roomsResult, reservationsResult] = await Promise.all([
      Promise.allSettled(
        COUNT_CARDS.map(async (card) => {
          const result = await api.list<Entity>(COUNT_ENDPOINTS[card.key], {
            limit: 1,
          });
          return { key: card.key, total: result.meta?.total ?? 0 };
        }),
      ),
      api.list<Room>("/rooms", { limit: 100, sort: "number" }).then(
        (result) => ({ ok: true as const, data: result.data ?? [] }),
        (reason: unknown) => ({ ok: false as const, reason }),
      ),
      api
        .list<Reservation>("/reservations", {
          limit: 100,
          sort: "-created_at",
        })
        .then(
          (result) => ({ ok: true as const, data: result.data ?? [] }),
          (reason: unknown) => ({ ok: false as const, reason }),
        ),
    ]);

    let failed = false;
    const nextCounts: Record<string, number> = {};
    const errors: string[] = [];

    countResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        nextCounts[result.value.key] = result.value.total;
      } else {
        failed = true;
        errors.push(
          `${COUNT_CARDS[index].label} : ${
            result.reason instanceof Error
              ? result.reason.message
              : "indisponible"
          }`,
        );
      }
    });

    if (roomsResult.ok) {
      setRooms(roomsResult.data);
    } else {
      failed = true;
      setRooms(
        DEMO_MODE ? getMockList<Room>("rooms", { limit: 100 }).data : [],
      );
      errors.push(
        `Chambres : ${
          roomsResult.reason instanceof Error
            ? roomsResult.reason.message
            : "indisponible"
        }`,
      );
    }

    if (reservationsResult.ok) {
      setReservations(reservationsResult.data);
    } else {
      failed = true;
      setReservations(
        DEMO_MODE
          ? getMockList<Reservation>("reservations", { limit: 100 }).data
          : [],
      );
      errors.push(
        `Réservations : ${
          reservationsResult.reason instanceof Error
            ? reservationsResult.reason.message
            : "indisponible"
        }`,
      );
    }

    if (failed && DEMO_MODE) {
      const mock = getMockCounts();
      COUNT_CARDS.forEach((card) => {
        if (nextCounts[card.key] === undefined) {
          nextCounts[card.key] = mock[card.key] ?? 0;
        }
      });
    }
    COUNT_CARDS.forEach((card) => {
      nextCounts[card.key] ??= 0;
    });

    setCounts(nextCounts);
    setUsingFallback(failed && DEMO_MODE);
    setApiError(errors.length > 0 ? errors.join(" · ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const occupancy = useMemo(() => {
    if (rooms.length === 0) return 0;
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    return Math.round((occupied / rooms.length) * 100);
  }, [rooms]);

  const roomStatusChart = useMemo(() => {
    const tally: Record<string, number> = {};
    rooms.forEach((room) => {
      const key = room.status ?? "unknown";
      tally[key] = (tally[key] ?? 0) + 1;
    });
    const labels = Object.keys(tally).map((k) => STATUS_LABELS[k] ?? k);
    const data = Object.keys(tally).map((k) => tally[k]);
    const colors = Object.keys(tally).map(
      (k) => ROOM_STATUS_COLORS[k] ?? "#9ca3af",
    );
    return { labels, data, colors };
  }, [rooms]);

  const reservationStatusChart = useMemo(() => {
    const tally: Record<string, number> = {};
    reservations.forEach((reservation) => {
      const key = reservation.status ?? "unknown";
      tally[key] = (tally[key] ?? 0) + 1;
    });
    const labels = Object.keys(tally).map((k) => STATUS_LABELS[k] ?? k);
    const data = Object.keys(tally).map((k) => tally[k]);
    const colors = Object.keys(tally).map(
      (k) => RESERVATION_STATUS_COLORS[k] ?? "#9ca3af",
    );
    return { labels, data, colors };
  }, [reservations]);

  const recentReservations = reservations.slice(0, 5);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="spinner-circle"></div>
          <div className="spinner-circle-delayed"></div>
        </div>
        <p className="mt-3 text-muted">Chargement du tableau de bord…</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            width: 100%;
          }
          .spinner-wrapper {
            position: relative;
            width: 60px;
            height: 60px;
          }
          .spinner-circle,
          .spinner-circle-delayed {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid transparent;
            border-top-color: var(--ps-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .spinner-circle-delayed {
            border-top-color: #86efac;
            animation: spin 1.2s linear infinite reverse;
            opacity: 0.7;
          }
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {usingFallback && (
        <div className="demo-banner">
          <i className="pi pi-info-circle"></i>
          <span>
            Backend indisponible — données de démonstration affichées.
          </span>
        </div>
      )}
      {apiError && !usingFallback && (
        <div className="demo-banner" role="alert">
          <i className="pi pi-exclamation-triangle"></i>
          <span>Impossible de charger toutes les données : {apiError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="dashboard-retry"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Welcome Card */}
      <div className="welcome-card">
        <div className="welcome-content">
          <h2 className="welcome-title">Bienvenue sur PleasantStay</h2>
          <p className="welcome-subtitle">
            Voici l’activité de votre réseau hôtelier et les opérations en cours.
          </p>
        </div>
        <div className="welcome-date">
          <i className="pi pi-calendar me-2"></i>
          {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {COUNT_CARDS.map((card) => (
          <div key={card.key} className="stat-card">
            <div className="stat-icon-wrapper">
              <i className={`${card.icon} stat-icon`}></i>
            </div>
            <div className="stat-info">
              <h3 className="stat-value">
                {(counts[card.key] ?? 0).toLocaleString("fr-FR")}
              </h3>
              <p className="stat-label">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy highlight */}
      <div className="occupancy-bar">
        <div className="occupancy-info">
          <i className="pi pi-chart-line"></i>
          <span>
            Taux d’occupation : <strong>{occupancy}%</strong>
          </span>
        </div>
        <div className="occupancy-track">
          <div className="occupancy-fill" style={{ width: `${occupancy}%` }} />
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="content-card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="pi pi-home me-2"></i>
              Statut des chambres
            </h5>
          </div>
          {roomStatusChart.data.length > 0 ? (
            <div className="chart-box">
              <Doughnut
                data={{
                  labels: roomStatusChart.labels,
                  datasets: [
                    {
                      data: roomStatusChart.data,
                      backgroundColor: roomStatusChart.colors,
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          ) : (
            <p className="empty-text">Aucune chambre.</p>
          )}
        </div>

        <div className="content-card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="pi pi-calendar me-2"></i>
              Réservations par statut
            </h5>
          </div>
          {reservationStatusChart.data.length > 0 ? (
            <div className="chart-box">
              <Bar
                data={{
                  labels: reservationStatusChart.labels,
                  datasets: [
                    {
                      label: "Réservations",
                      data: reservationStatusChart.data,
                      backgroundColor: reservationStatusChart.colors,
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          ) : (
            <p className="empty-text">Aucune réservation.</p>
          )}
        </div>
      </div>

      {/* Recent reservations + quick actions */}
      <div className="dashboard-grid">
        <div className="content-card activity-card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="pi pi-clock me-2"></i>
              Réservations récentes
            </h5>
            <Link href="/admin/reservations" className="view-all-btn">
              Voir tout
            </Link>
          </div>
          <div className="activity-list">
            {recentReservations.length === 0 ? (
              <p className="empty-text">Aucune réservation récente.</p>
            ) : (
              recentReservations.map((reservation) => (
                <div
                  key={String(reservation._id ?? reservation.id)}
                  className="activity-item"
                >
                  <div className="activity-icon bg-success-light">
                    <i className="pi pi-calendar"></i>
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">
                      {reservation.confirmation_code ?? "Réservation"}
                    </p>
                    <p className="activity-description">
                      {reservation.check_in
                        ? `Arrivée le ${new Date(
                            reservation.check_in,
                          ).toLocaleDateString("fr-FR")}`
                        : "Date non renseignée"}
                    </p>
                  </div>
                  <div className="activity-time">
                    <span className={`badge tone-${reservation.status ?? "muted"}`}>
                      {STATUS_LABELS[reservation.status ?? ""] ??
                        reservation.status ??
                        "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="content-card actions-card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="pi pi-bolt me-2"></i>
              Actions rapides
            </h5>
          </div>
          <div className="actions-list">
            <Link href="/admin/reservations" className="action-btn">
              <i className="pi pi-calendar"></i>
              <span>Voir les réservations</span>
              <i className="pi pi-arrow-right arrow-icon"></i>
            </Link>
            <Link href="/admin/rooms" className="action-btn">
              <i className="pi pi-home"></i>
              <span>Gérer les chambres</span>
              <i className="pi pi-arrow-right arrow-icon"></i>
            </Link>
            <Link href="/admin/guests" className="action-btn">
              <i className="pi pi-users"></i>
              <span>Voir les clients</span>
              <i className="pi pi-arrow-right arrow-icon"></i>
            </Link>
            <Link href="/admin/invoices" className="action-btn">
              <i className="pi pi-file"></i>
              <span>Consulter les factures</span>
              <i className="pi pi-arrow-right arrow-icon"></i>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          width: 100%;
          animation: fadeIn 0.5s ease;
        }

        .demo-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          padding: 0.65rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .welcome-card {
          background: linear-gradient(135deg, var(--ps-primary) 0%, var(--ps-primary-hover) 100%);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          box-shadow: 0 10px 30px rgba(var(--ps-primary-rgb), 0.2);
        }

        .welcome-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
        }

        .welcome-subtitle {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0;
        }

        .welcome-date {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 50px;
          color: white;
          font-size: 0.875rem;
          backdrop-filter: blur(5px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(var(--ps-primary-rgb), 0.1);
        }

        .stat-icon-wrapper {
          width: 54px;
          height: 54px;
          background: rgba(var(--ps-primary-rgb), 0.1);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon {
          font-size: 1.6rem;
          color: var(--ps-primary);
        }

        .stat-info {
          flex: 1;
        }

        .stat-value {
          font-size: 1.7rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 0.15rem;
        }

        .stat-label {
          color: #6c757d;
          margin-bottom: 0;
          font-size: 0.85rem;
        }

        .occupancy-bar {
          background: white;
          border-radius: 16px;
          padding: 1rem 1.25rem;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.04);
          margin-bottom: 1.5rem;
        }

        .occupancy-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #374151;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .occupancy-info i {
          color: var(--ps-primary);
        }

        .occupancy-track {
          height: 10px;
          background: #e5e7eb;
          border-radius: 50px;
          overflow: hidden;
        }

        .occupancy-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ps-primary), var(--ps-primary-hover));
          border-radius: 50px;
          transition: width 0.6s ease;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .chart-box {
          height: 280px;
          position: relative;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .content-card {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .view-all-btn {
          background: none;
          border: none;
          color: var(--ps-primary);
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: none;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.6rem 0.25rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bg-success-light {
          background: rgba(var(--ps-primary-rgb), 0.1);
          color: var(--ps-primary);
        }

        .activity-content {
          flex: 1;
        }

        .activity-title {
          font-weight: 600;
          margin-bottom: 0.2rem;
          font-size: 0.9rem;
        }

        .activity-description {
          font-size: 0.75rem;
          color: #6c757d;
          margin-bottom: 0;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.6rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .tone-pending,
        .tone-dirty,
        .tone-inspection {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
        }
        .tone-confirmed,
        .tone-occupied {
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
        }
        .tone-checked_in,
        .tone-checked_out,
        .tone-clean {
          background: rgba(var(--ps-primary-rgb), 0.12);
          color: var(--ps-primary-dark);
        }
        .tone-cancelled,
        .tone-no_show,
        .tone-maintenance {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }
        .tone-muted,
        .tone-blocked {
          background: rgba(107, 114, 128, 0.12);
          color: #4b5563;
        }

        .actions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          background: #f8f9fa;
          border: none;
          border-radius: 12px;
          color: #1f2937;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .action-btn i:first-child {
          font-size: 1.1rem;
          color: var(--ps-primary);
          width: 24px;
        }

        .action-btn span {
          flex: 1;
          text-align: left;
        }

        .arrow-icon {
          opacity: 0;
          transition: all 0.3s ease;
        }

        .action-btn:hover {
          background: rgba(var(--ps-primary-rgb), 0.1);
          transform: translateX(5px);
        }

        .action-btn:hover .arrow-icon {
          opacity: 1;
          transform: translateX(5px);
        }

        .empty-text {
          color: #9ca3af;
          text-align: center;
          padding: 1.5rem 0;
          margin: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 992px) {
          .dashboard-grid,
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .welcome-card {
            flex-direction: column;
            text-align: center;
          }
          .welcome-title {
            font-size: 1.5rem;
          }
          .stat-value {
            font-size: 1.4rem;
          }
        }
      `}</style>
    </div>
  );
}

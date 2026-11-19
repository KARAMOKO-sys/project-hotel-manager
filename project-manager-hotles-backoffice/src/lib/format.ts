// src/lib/format.ts
// Formatage partagé des pages ERP (montants, dates).

export function formatAmount(value: unknown, currency = "XOF"): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "XOF" ? 0 : 2,
    }).format(num);
  } catch {
    return `${num.toLocaleString("fr-FR")} ${currency}`;
  }
}

export function formatDay(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Date du jour au format AAAA-MM-JJ (fuseau local). */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Premier jour de l'année en cours (AAAA-01-01). */
export function startOfYearIso(): string {
  return `${new Date().getFullYear()}-01-01`;
}

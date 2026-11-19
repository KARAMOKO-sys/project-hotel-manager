// src/app/admin/accounting-reports/page.tsx
// États comptables : balance générale, compte de résultat, bilan et balance
// âgée des créances clients, calculés par le backend sur les écritures
// comptabilisées de la propriété courante.

"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { api, apiFetch } from "@/lib/api";
import { formatAmount, startOfYearIso, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";

type Tab = "trial" | "income" | "balance" | "aging";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "trial", label: "Balance", icon: "pi pi-list" },
  { key: "income", label: "Compte de résultat", icon: "pi pi-chart-line" },
  { key: "balance", label: "Bilan", icon: "pi pi-chart-bar" },
  { key: "aging", label: "Balance âgée", icon: "pi pi-clock" },
];

interface TrialLine {
  account_id: string;
  code: string;
  name: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

interface TrialBalance {
  date_from: string | null;
  date_to: string;
  lines: TrialLine[];
  totals: Omit<TrialLine, "account_id" | "code" | "name">;
  balanced: boolean;
}

interface ReportAccountLine {
  account_id: string;
  code: string;
  name: string;
  amount: number;
}

interface ReportGroup {
  key: string;
  label: string;
  accounts: ReportAccountLine[];
  total: number;
}

interface IncomeStatement {
  date_from: string | null;
  date_to: string;
  income: { groups: ReportGroup[]; total: number };
  expenses: { groups: ReportGroup[]; total: number };
  net_result: number;
}

interface BalanceSheet {
  date: string;
  assets: { sections: ReportGroup[]; total: number };
  liabilities: { sections: ReportGroup[]; total: number };
  period_result: number;
  balanced: boolean;
}

type Buckets = Record<"current" | "days_31_60" | "days_61_90" | "over_90", number>;

interface ReceivablesAging {
  account?: { id: string; code: string; name: string };
  as_of: string;
  partners: Array<{
    partner_type: string | null;
    partner_id: string | null;
    buckets: Buckets;
    unallocated_credit: number;
    balance: number;
  }>;
  totals: Buckets & { unallocated_credit: number; balance: number };
}

const PARTNER_TYPES: Record<string, string> = {
  guest: "Client",
  vendor: "Fournisseur",
  other: "Autre",
};

function money(value: unknown): string {
  return formatAmount(value, "XOF");
}

function amountCell(value: number) {
  return <td className="num">{value ? money(value) : "—"}</td>;
}

export default function AccountingReportsPage() {
  const { propertyId, property } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [tab, setTab] = useState<Tab>("trial");
  const [dateFrom, setDateFrom] = useState(startOfYearIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [asOf, setAsOf] = useState(todayIso);
  const [report, setReport] = useState<unknown>(null);
  const [reportTab, setReportTab] = useState<Tab | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  const checkAccounts = useCallback(async () => {
    if (!propertyId) return;
    try {
      const result = await api.list("/accounting/accounts", {
        property_id: propertyId,
        page: 1,
        limit: 1,
      });
      setAccountCount(result.meta?.total ?? result.data?.length ?? 0);
    } catch {
      setAccountCount(null);
    }
  }, [propertyId]);

  useEffect(() => {
    void checkAccounts();
  }, [checkAccounts]);

  const load = useCallback(async () => {
    if (!propertyId) return;
    const params = new URLSearchParams({ property_id: propertyId });
    let path: string;
    if (tab === "trial" || tab === "income") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      path = tab === "trial" ? "trial-balance" : "income-statement";
    } else if (tab === "balance") {
      if (asOf) params.set("date", asOf);
      path = "balance-sheet";
    } else {
      if (asOf) params.set("as_of", asOf);
      path = "receivables-aging";
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<unknown>(`/accounting/reports/${path}?${params.toString()}`);
      setReport(data);
      setReportTab(tab);
    } catch (loadError) {
      setReport(null);
      setReportTab(null);
      setError(errorMessage(loadError, "Impossible de calculer l’état"));
    } finally {
      setLoading(false);
    }
  }, [propertyId, tab, dateFrom, dateTo, asOf]);

  useEffect(() => {
    void load();
  }, [load]);

  const setup = async () => {
    if (!propertyId) return;
    const accepted = await confirm(
      "Créer le plan comptable SYSCOHADA, les journaux et les paramètres comptables de cette propriété ?",
      "Initialiser la comptabilité",
    );
    if (!accepted) return;
    setSettingUp(true);
    try {
      await apiFetch("/accounting/setup", {
        method: "POST",
        body: JSON.stringify({ property_id: propertyId }),
      });
      notify("success", "Comptabilité initialisée", "Plan comptable et journaux créés.");
      await Promise.all([checkAccounts(), load()]);
    } catch (setupError) {
      notify("error", "Initialisation impossible", errorMessage(setupError));
    } finally {
      setSettingUp(false);
    }
  };

  const periodPicker = tab === "trial" || tab === "income";

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h2>
            <i className="pi pi-chart-bar"></i>États comptables
          </h2>
          <p>
            {property?.name ? `${property.name} · ` : ""}Écritures comptabilisées
            uniquement · montants en XOF
          </p>
        </div>
        <div className="erp-toolbar">
          {periodPicker ? (
            <>
              <label>
                Du
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                Au
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </>
          ) : (
            <label>
              {tab === "balance" ? "Situation au" : "Ancienneté au"}
              <input
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
              />
            </label>
          )}
          <button type="button" className="rp-btn" onClick={() => void load()}>
            <i className={loading ? "pi pi-spin pi-spinner" : "pi pi-refresh"}></i>
            Calculer
          </button>
        </div>
      </div>

      {!propertyId && (
        <div className="rp-info">
          <i className="pi pi-info-circle"></i>
          Sélectionnez une propriété dans l’en-tête pour afficher ses états comptables.
        </div>
      )}

      {propertyId && accountCount === 0 && (
        <div className="erp-card" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            Aucun compte comptable pour cette propriété. Initialisez le plan comptable
            SYSCOHADA et les journaux par défaut pour commencer.
          </p>
          <button
            type="button"
            className="rp-btn rp-btn-primary"
            onClick={() => void setup()}
            disabled={settingUp}
          >
            <i className={settingUp ? "pi pi-spin pi-spinner" : "pi pi-bolt"}></i>
            Initialiser le plan comptable
          </button>
        </div>
      )}

      <div className="erp-tabs" role="tablist" aria-label="États comptables">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            <i className={`${item.icon} me-1`}></i>
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rp-alert" role="alert" style={{ marginBottom: "1rem" }}>
          <i className="pi pi-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {loading && reportTab !== tab ? (
        <div className="erp-empty">
          <i className="pi pi-spin pi-spinner"></i>Calcul en cours…
        </div>
      ) : reportTab === "trial" && reportTab === tab ? (
        <TrialBalanceView data={report as TrialBalance} />
      ) : reportTab === "income" && reportTab === tab ? (
        <IncomeStatementView data={report as IncomeStatement} />
      ) : reportTab === "balance" && reportTab === tab ? (
        <BalanceSheetView data={report as BalanceSheet} />
      ) : reportTab === "aging" && reportTab === tab ? (
        <AgingView data={report as ReceivablesAging} />
      ) : null}
    </div>
  );
}

function TrialBalanceView({ data }: { data: TrialBalance }) {
  const lines = data.lines ?? [];
  return (
    <>
      <div className="erp-kpis">
        <div className="erp-kpi">
          <span>Mouvements débit</span>
          <strong>{money(data.totals?.period_debit)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Mouvements crédit</span>
          <strong>{money(data.totals?.period_credit)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Équilibre</span>
          <strong>
            <span className={`erp-badge ${data.balanced ? "success" : "danger"}`}>
              {data.balanced ? "Balance équilibrée" : "Déséquilibrée"}
            </span>
          </strong>
        </div>
      </div>
      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Intitulé</th>
              <th className="num">Ouverture D</th>
              <th className="num">Ouverture C</th>
              <th className="num">Période D</th>
              <th className="num">Période C</th>
              <th className="num">Solde D</th>
              <th className="num">Solde C</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="erp-empty">
                  Aucun mouvement comptabilisé sur la période.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.account_id}>
                  <td>{line.code}</td>
                  <td>{line.name}</td>
                  {amountCell(line.opening_debit)}
                  {amountCell(line.opening_credit)}
                  {amountCell(line.period_debit)}
                  {amountCell(line.period_credit)}
                  {amountCell(line.closing_debit)}
                  {amountCell(line.closing_credit)}
                </tr>
              ))
            )}
          </tbody>
          {data.totals && lines.length > 0 && (
            <tfoot>
              <tr className="erp-total-row">
                <td colSpan={2}>Totaux</td>
                {amountCell(data.totals.opening_debit)}
                {amountCell(data.totals.opening_credit)}
                {amountCell(data.totals.period_debit)}
                {amountCell(data.totals.period_credit)}
                {amountCell(data.totals.closing_debit)}
                {amountCell(data.totals.closing_credit)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

function GroupTable({
  title,
  groups,
  total,
  totalLabel,
}: {
  title: string;
  groups: ReportGroup[];
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="erp-table-wrap">
      <table className="erp-table" style={{ minWidth: 0 }}>
        <thead>
          <tr>
            <th colSpan={2}>{title}</th>
            <th className="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={3} className="erp-empty">
                Aucun montant.
              </td>
            </tr>
          ) : (
            groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="erp-group-row">
                  <td colSpan={2}>{group.label}</td>
                  <td className="num">{money(group.total)}</td>
                </tr>
                {group.accounts.map((account) => (
                  <tr key={`${group.key}-${account.account_id || account.code}`}>
                    <td>{account.code}</td>
                    <td>{account.name}</td>
                    <td className="num">{money(account.amount)}</td>
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="erp-total-row">
            <td colSpan={2}>{totalLabel}</td>
            <td className="num">{money(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function IncomeStatementView({ data }: { data: IncomeStatement }) {
  const profit = data.net_result >= 0;
  return (
    <>
      <div className="erp-kpis">
        <div className="erp-kpi">
          <span>Produits</span>
          <strong>{money(data.income?.total)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Charges</span>
          <strong>{money(data.expenses?.total)}</strong>
        </div>
        <div className="erp-kpi">
          <span>{profit ? "Bénéfice" : "Perte"}</span>
          <strong style={{ color: profit ? "#15803d" : "#b91c1c" }}>
            {money(data.net_result)}
          </strong>
        </div>
      </div>
      <div className="erp-two-cols">
        <GroupTable
          title="Produits"
          groups={data.income?.groups ?? []}
          total={data.income?.total ?? 0}
          totalLabel="Total des produits"
        />
        <GroupTable
          title="Charges"
          groups={data.expenses?.groups ?? []}
          total={data.expenses?.total ?? 0}
          totalLabel="Total des charges"
        />
      </div>
    </>
  );
}

function BalanceSheetView({ data }: { data: BalanceSheet }) {
  return (
    <>
      <div className="erp-kpis">
        <div className="erp-kpi">
          <span>Total actif</span>
          <strong>{money(data.assets?.total)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Total passif</span>
          <strong>{money(data.liabilities?.total)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Résultat non affecté</span>
          <strong>{money(data.period_result)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Équilibre</span>
          <strong>
            <span className={`erp-badge ${data.balanced ? "success" : "danger"}`}>
              {data.balanced ? "Bilan équilibré" : "Déséquilibré"}
            </span>
          </strong>
        </div>
      </div>
      <div className="erp-two-cols">
        <GroupTable
          title="Actif"
          groups={data.assets?.sections ?? []}
          total={data.assets?.total ?? 0}
          totalLabel="Total actif"
        />
        <GroupTable
          title="Passif"
          groups={data.liabilities?.sections ?? []}
          total={data.liabilities?.total ?? 0}
          totalLabel="Total passif"
        />
      </div>
    </>
  );
}

function AgingView({ data }: { data: ReceivablesAging }) {
  const partners = data.partners ?? [];
  return (
    <>
      <div className="erp-kpis">
        <div className="erp-kpi">
          <span>Compte</span>
          <strong>
            {data.account ? `${data.account.code} — ${data.account.name}` : "—"}
          </strong>
        </div>
        <div className="erp-kpi">
          <span>Encours total</span>
          <strong>{money(data.totals?.balance)}</strong>
        </div>
        <div className="erp-kpi">
          <span>Plus de 90 jours</span>
          <strong style={{ color: data.totals?.over_90 ? "#b91c1c" : undefined }}>
            {money(data.totals?.over_90)}
          </strong>
        </div>
      </div>
      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Tiers</th>
              <th className="num">0–30 j</th>
              <th className="num">31–60 j</th>
              <th className="num">61–90 j</th>
              <th className="num">+ 90 j</th>
              <th className="num">Crédits non imputés</th>
              <th className="num">Solde</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={7} className="erp-empty">
                  Aucune créance ouverte.
                </td>
              </tr>
            ) : (
              partners.map((partner, index) => (
                <tr key={`${partner.partner_type ?? ""}-${partner.partner_id ?? index}`}>
                  <td>
                    {partner.partner_type
                      ? PARTNER_TYPES[partner.partner_type] ?? partner.partner_type
                      : "Sans tiers"}
                    {partner.partner_id ? (
                      <small className="text-muted"> · {partner.partner_id.slice(-6)}</small>
                    ) : null}
                  </td>
                  {amountCell(partner.buckets.current)}
                  {amountCell(partner.buckets.days_31_60)}
                  {amountCell(partner.buckets.days_61_90)}
                  {amountCell(partner.buckets.over_90)}
                  {amountCell(partner.unallocated_credit)}
                  <td className="num">
                    <strong>{money(partner.balance)}</strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.totals && partners.length > 0 && (
            <tfoot>
              <tr className="erp-total-row">
                <td>Totaux</td>
                {amountCell(data.totals.current)}
                {amountCell(data.totals.days_31_60)}
                {amountCell(data.totals.days_61_90)}
                {amountCell(data.totals.over_90)}
                {amountCell(data.totals.unallocated_credit)}
                {amountCell(data.totals.balance)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

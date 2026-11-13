// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/kpi/controllers/kpi.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ComparePeriodsDto, CreateKpiDto, Kpi, KpiComparison, KpiFilterQueryDto, KpiInputDto, KpiLatestQueryDto, KpiMetrics, KpiTrendPoint, KpiTrendQueryDto, MetricVariation, PaginatedResult, UpdateKpiDto } from "@/types/api";

/** POST /kpis */
export async function create(body: CreateKpiDto): Promise<Kpi> {
  const { data } = await apiClient.post<Kpi>("/kpis", body);
  return data;
}

/** POST /kpis/calculate */
export async function calculate(body: KpiInputDto): Promise<KpiMetrics> {
  const { data } = await apiClient.post<KpiMetrics>("/kpis/calculate", body);
  return data;
}

/** POST /kpis/compare */
export async function comparePeriods(body: ComparePeriodsDto): Promise<{ current: KpiMetrics; previous: KpiMetrics; variations: { occupancy_rate?: MetricVariation; adr?: MetricVariation; revpar?: MetricVariation; trevpar?: MetricVariation; goppar?: MetricVariation; room_revenue?: MetricVariation; total_revenue?: MetricVariation; cancellation_rate?: MetricVariation; average_length_of_stay?: MetricVariation; rooms_sold?: MetricVariation } }> {
  const { data } = await apiClient.post<{ current: KpiMetrics; previous: KpiMetrics; variations: { occupancy_rate?: MetricVariation; adr?: MetricVariation; revpar?: MetricVariation; trevpar?: MetricVariation; goppar?: MetricVariation; room_revenue?: MetricVariation; total_revenue?: MetricVariation; cancellation_rate?: MetricVariation; average_length_of_stay?: MetricVariation; rooms_sold?: MetricVariation } }>("/kpis/compare", body);
  return data;
}

/** GET /kpis */
export async function findAll(query?: KpiFilterQueryDto): Promise<PaginatedResult<Kpi>> {
  const { data } = await apiClient.get<PaginatedResult<Kpi>>("/kpis", { params: query });
  return data;
}

/** GET /kpis/property/:propertyId */
export async function findByProperty(propertyId: string, query?: KpiFilterQueryDto): Promise<PaginatedResult<Kpi>> {
  const { data } = await apiClient.get<PaginatedResult<Kpi>>(`/kpis/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /kpis/property/:propertyId/latest */
export async function getLatest(propertyId: string, query?: KpiLatestQueryDto): Promise<Kpi> {
  const { data } = await apiClient.get<Kpi>(`/kpis/property/${encodeURIComponent(propertyId)}/latest`, { params: query });
  return data;
}

/** GET /kpis/property/:propertyId/trend */
export async function getTrend(propertyId: string, query: KpiTrendQueryDto): Promise<KpiTrendPoint[]> {
  const { data } = await apiClient.get<KpiTrendPoint[]>(`/kpis/property/${encodeURIComponent(propertyId)}/trend`, { params: query });
  return data;
}

/** GET /kpis/:id */
export async function findOne(id: string): Promise<Kpi> {
  const { data } = await apiClient.get<Kpi>(`/kpis/${encodeURIComponent(id)}`);
  return data;
}

/** GET /kpis/:id/comparison */
export async function compareWithPrevious(id: string): Promise<KpiComparison> {
  const { data } = await apiClient.get<KpiComparison>(`/kpis/${encodeURIComponent(id)}/comparison`);
  return data;
}

/** PATCH /kpis/:id */
export async function update(id: string, body: UpdateKpiDto = {}): Promise<Kpi> {
  const { data } = await apiClient.patch<Kpi>(`/kpis/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /kpis/:id */
export async function remove(id: string): Promise<Kpi> {
  const { data } = await apiClient.delete<Kpi>(`/kpis/${encodeURIComponent(id)}`);
  return data;
}

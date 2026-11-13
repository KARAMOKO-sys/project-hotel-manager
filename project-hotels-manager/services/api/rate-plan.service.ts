// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/rate-plan/controllers/rate-plan.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ApplicableRatePlansQueryDto, CancellationFeeDto, CancellationFeeResult, CreateRatePlanDto, PaginatedResult, PaginationQueryDto, RatePlan, UpdateRatePlanDto } from "@/types/api";

/** POST /rate-plans */
export async function create(body: CreateRatePlanDto): Promise<RatePlan> {
  const { data } = await apiClient.post<RatePlan>("/rate-plans", body);
  return data;
}

/** GET /rate-plans */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<RatePlan>> {
  const { data } = await apiClient.get<PaginatedResult<RatePlan>>("/rate-plans", { params: query });
  return data;
}

/** GET /rate-plans/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<RatePlan>> {
  const { data } = await apiClient.get<PaginatedResult<RatePlan>>(`/rate-plans/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /rate-plans/property/:propertyId/applicable */
export async function findApplicable(propertyId: string, query: ApplicableRatePlansQueryDto): Promise<RatePlan[]> {
  const { data } = await apiClient.get<RatePlan[]>(`/rate-plans/property/${encodeURIComponent(propertyId)}/applicable`, { params: query });
  return data;
}

/** GET /rate-plans/:id */
export async function findOne(id: string): Promise<RatePlan> {
  const { data } = await apiClient.get<RatePlan>(`/rate-plans/${encodeURIComponent(id)}`);
  return data;
}

/** POST /rate-plans/:id/cancellation-fee */
export async function calculateCancellationFee(id: string, body: CancellationFeeDto): Promise<CancellationFeeResult> {
  const { data } = await apiClient.post<CancellationFeeResult>(`/rate-plans/${encodeURIComponent(id)}/cancellation-fee`, body);
  return data;
}

/** PATCH /rate-plans/:id */
export async function update(id: string, body: UpdateRatePlanDto = {}): Promise<RatePlan> {
  const { data } = await apiClient.patch<RatePlan>(`/rate-plans/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /rate-plans/:id/activate */
export async function activate(id: string): Promise<RatePlan> {
  const { data } = await apiClient.patch<RatePlan>(`/rate-plans/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /rate-plans/:id/deactivate */
export async function deactivate(id: string): Promise<RatePlan> {
  const { data } = await apiClient.patch<RatePlan>(`/rate-plans/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** DELETE /rate-plans/:id */
export async function remove(id: string): Promise<RatePlan> {
  const { data } = await apiClient.delete<RatePlan>(`/rate-plans/${encodeURIComponent(id)}`);
  return data;
}

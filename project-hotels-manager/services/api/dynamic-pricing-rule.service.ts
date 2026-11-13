// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/dynamic-pricing-rule/controllers/dynamic-pricing-rule.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CalculateAdjustedPriceDto, CreateDynamicPricingRuleDto, DynamicPricingRule, PaginatedResult, PaginationQueryDto, PricingResult, UpdateDynamicPricingRuleDto, ValidateRuleDto } from "@/types/api";

/** POST /dynamic-pricing-rules */
export async function create(body: CreateDynamicPricingRuleDto): Promise<DynamicPricingRule> {
  const { data } = await apiClient.post<DynamicPricingRule>("/dynamic-pricing-rules", body);
  return data;
}

/** GET /dynamic-pricing-rules */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<DynamicPricingRule>> {
  const { data } = await apiClient.get<PaginatedResult<DynamicPricingRule>>("/dynamic-pricing-rules", { params: query });
  return data;
}

/** GET /dynamic-pricing-rules/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<DynamicPricingRule>> {
  const { data } = await apiClient.get<PaginatedResult<DynamicPricingRule>>(`/dynamic-pricing-rules/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /dynamic-pricing-rules/property/:propertyId/active */
export async function findActiveRules(propertyId: string, query?: { room_type_id?: string }): Promise<DynamicPricingRule[]> {
  const { data } = await apiClient.get<DynamicPricingRule[]>(`/dynamic-pricing-rules/property/${encodeURIComponent(propertyId)}/active`, { params: query });
  return data;
}

/** POST /dynamic-pricing-rules/property/:propertyId/calculate */
export async function calculateAdjustedPrice(propertyId: string, body: CalculateAdjustedPriceDto): Promise<PricingResult> {
  const { data } = await apiClient.post<PricingResult>(`/dynamic-pricing-rules/property/${encodeURIComponent(propertyId)}/calculate`, body);
  return data;
}

/** GET /dynamic-pricing-rules/:id */
export async function findOne(id: string): Promise<DynamicPricingRule> {
  const { data } = await apiClient.get<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /dynamic-pricing-rules/:id */
export async function update(id: string, body: UpdateDynamicPricingRuleDto = {}): Promise<DynamicPricingRule> {
  const { data } = await apiClient.patch<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /dynamic-pricing-rules/:id/validate */
export async function validateRule(id: string, body: ValidateRuleDto = {}): Promise<DynamicPricingRule> {
  const { data } = await apiClient.patch<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}/validate`, body);
  return data;
}

/** PATCH /dynamic-pricing-rules/:id/activate */
export async function activate(id: string): Promise<DynamicPricingRule> {
  const { data } = await apiClient.patch<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /dynamic-pricing-rules/:id/deactivate */
export async function deactivate(id: string): Promise<DynamicPricingRule> {
  const { data } = await apiClient.patch<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** DELETE /dynamic-pricing-rules/:id */
export async function remove(id: string): Promise<DynamicPricingRule> {
  const { data } = await apiClient.delete<DynamicPricingRule>(`/dynamic-pricing-rules/${encodeURIComponent(id)}`);
  return data;
}

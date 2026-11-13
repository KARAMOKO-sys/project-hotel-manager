// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/tax-rate/controllers/tax-rate.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ApplicableTaxesQueryDto, CalculateTaxDto, CreateTaxRateDto, PaginatedResult, PaginationQueryDto, TaxCalculationResult, TaxRate, UpdateTaxRateDto } from "@/types/api";

/** POST /tax-rates */
export async function create(body: CreateTaxRateDto): Promise<TaxRate> {
  const { data } = await apiClient.post<TaxRate>("/tax-rates", body);
  return data;
}

/** GET /tax-rates */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<TaxRate>> {
  const { data } = await apiClient.get<PaginatedResult<TaxRate>>("/tax-rates", { params: query });
  return data;
}

/** GET /tax-rates/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<TaxRate>> {
  const { data } = await apiClient.get<PaginatedResult<TaxRate>>(`/tax-rates/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /tax-rates/property/:propertyId/applicable */
export async function getApplicableTaxes(propertyId: string, query?: ApplicableTaxesQueryDto): Promise<TaxRate[]> {
  const { data } = await apiClient.get<TaxRate[]>(`/tax-rates/property/${encodeURIComponent(propertyId)}/applicable`, { params: query });
  return data;
}

/** POST /tax-rates/property/:propertyId/calculate */
export async function calculateTaxes(propertyId: string, body: CalculateTaxDto): Promise<TaxCalculationResult> {
  const { data } = await apiClient.post<TaxCalculationResult>(`/tax-rates/property/${encodeURIComponent(propertyId)}/calculate`, body);
  return data;
}

/** GET /tax-rates/:id */
export async function findOne(id: string): Promise<TaxRate> {
  const { data } = await apiClient.get<TaxRate>(`/tax-rates/${encodeURIComponent(id)}`);
  return data;
}

/** POST /tax-rates/:id/calculate */
export async function calculateTax(id: string, body: CalculateTaxDto): Promise<TaxCalculationResult> {
  const { data } = await apiClient.post<TaxCalculationResult>(`/tax-rates/${encodeURIComponent(id)}/calculate`, body);
  return data;
}

/** PATCH /tax-rates/:id */
export async function update(id: string, body: UpdateTaxRateDto = {}): Promise<TaxRate> {
  const { data } = await apiClient.patch<TaxRate>(`/tax-rates/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /tax-rates/:id/activate */
export async function activate(id: string): Promise<TaxRate> {
  const { data } = await apiClient.patch<TaxRate>(`/tax-rates/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /tax-rates/:id/deactivate */
export async function deactivate(id: string): Promise<TaxRate> {
  const { data } = await apiClient.patch<TaxRate>(`/tax-rates/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** DELETE /tax-rates/:id */
export async function remove(id: string): Promise<TaxRate> {
  const { data } = await apiClient.delete<TaxRate>(`/tax-rates/${encodeURIComponent(id)}`);
  return data;
}

// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/ia-prediction/controllers/ia-prediction.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AccuracyQueryDto, AccuracyReport, CreateIaPredictionDto, ForecastDto, ForecastResponse, IaPrediction, PaginatedResult, PendingEvaluationQueryDto, PredictionFilterQueryDto, RecordActualDto, UpdateIaPredictionDto } from "@/types/api";

/** POST /ia-predictions */
export async function create(body: CreateIaPredictionDto): Promise<IaPrediction> {
  const { data } = await apiClient.post<IaPrediction>("/ia-predictions", body);
  return data;
}

/** POST /ia-predictions/forecast */
export async function forecast(body: ForecastDto): Promise<ForecastResponse> {
  const { data } = await apiClient.post<ForecastResponse>("/ia-predictions/forecast", body);
  return data;
}

/** GET /ia-predictions */
export async function findAll(query?: PredictionFilterQueryDto): Promise<PaginatedResult<IaPrediction>> {
  const { data } = await apiClient.get<PaginatedResult<IaPrediction>>("/ia-predictions", { params: query });
  return data;
}

/** GET /ia-predictions/accuracy */
export async function getAccuracy(query?: AccuracyQueryDto): Promise<AccuracyReport> {
  const { data } = await apiClient.get<AccuracyReport>("/ia-predictions/accuracy", { params: query });
  return data;
}

/** GET /ia-predictions/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PredictionFilterQueryDto): Promise<PaginatedResult<IaPrediction>> {
  const { data } = await apiClient.get<PaginatedResult<IaPrediction>>(`/ia-predictions/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /ia-predictions/property/:propertyId/pending-evaluation */
export async function getPendingEvaluation(propertyId: string, query?: PendingEvaluationQueryDto): Promise<IaPrediction[]> {
  const { data } = await apiClient.get<IaPrediction[]>(`/ia-predictions/property/${encodeURIComponent(propertyId)}/pending-evaluation`, { params: query });
  return data;
}

/** GET /ia-predictions/:id */
export async function findOne(id: string): Promise<IaPrediction> {
  const { data } = await apiClient.get<IaPrediction>(`/ia-predictions/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /ia-predictions/:id */
export async function update(id: string, body: UpdateIaPredictionDto = {}): Promise<IaPrediction> {
  const { data } = await apiClient.patch<IaPrediction>(`/ia-predictions/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /ia-predictions/:id/actual */
export async function recordActual(id: string, body: RecordActualDto): Promise<IaPrediction> {
  const { data } = await apiClient.patch<IaPrediction>(`/ia-predictions/${encodeURIComponent(id)}/actual`, body);
  return data;
}

/** DELETE /ia-predictions/:id */
export async function remove(id: string): Promise<IaPrediction> {
  const { data } = await apiClient.delete<IaPrediction>(`/ia-predictions/${encodeURIComponent(id)}`);
  return data;
}

// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/sentiment-analysis/controllers/sentiment-analysis.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AcknowledgeAlertDto, AnalyzeTextDto, CreateSentimentAnalysisDto, PaginatedResult, ReviewAspect, SentimentAlertQueryDto, SentimentAnalysis, SentimentFilterQueryDto, SentimentPeriodQueryDto, SentimentScore, SentimentSummary, SentimentTrendQueryDto, TrendPoint, UpdateSentimentAnalysisDto } from "@/types/api";

/** POST /sentiment-analyses */
export async function create(body: CreateSentimentAnalysisDto): Promise<SentimentAnalysis> {
  const { data } = await apiClient.post<SentimentAnalysis>("/sentiment-analyses", body);
  return data;
}

/** POST /sentiment-analyses/analyze */
export async function analyzeText(body: AnalyzeTextDto): Promise<SentimentScore> {
  const { data } = await apiClient.post<SentimentScore>("/sentiment-analyses/analyze", body);
  return data;
}

/** GET /sentiment-analyses */
export async function findAll(query?: SentimentFilterQueryDto): Promise<PaginatedResult<SentimentAnalysis>> {
  const { data } = await apiClient.get<PaginatedResult<SentimentAnalysis>>("/sentiment-analyses", { params: query });
  return data;
}

/** GET /sentiment-analyses/property/:propertyId */
export async function findByProperty(propertyId: string, query?: SentimentFilterQueryDto): Promise<PaginatedResult<SentimentAnalysis>> {
  const { data } = await apiClient.get<PaginatedResult<SentimentAnalysis>>(`/sentiment-analyses/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /sentiment-analyses/property/:propertyId/summary */
export async function getSummary(propertyId: string, query?: SentimentPeriodQueryDto): Promise<SentimentSummary> {
  const { data } = await apiClient.get<SentimentSummary>(`/sentiment-analyses/property/${encodeURIComponent(propertyId)}/summary`, { params: query });
  return data;
}

/** GET /sentiment-analyses/property/:propertyId/trends */
export async function getTrends(propertyId: string, query?: SentimentTrendQueryDto): Promise<TrendPoint[]> {
  const { data } = await apiClient.get<TrendPoint[]>(`/sentiment-analyses/property/${encodeURIComponent(propertyId)}/trends`, { params: query });
  return data;
}

/** GET /sentiment-analyses/property/:propertyId/alerts */
export async function getAlerts(propertyId: string, query?: SentimentAlertQueryDto): Promise<SentimentAnalysis[]> {
  const { data } = await apiClient.get<SentimentAnalysis[]>(`/sentiment-analyses/property/${encodeURIComponent(propertyId)}/alerts`, { params: query });
  return data;
}

/** GET /sentiment-analyses/property/:propertyId/suggestions */
export async function getImprovementSuggestions(propertyId: string, query?: SentimentPeriodQueryDto): Promise<Array<{ aspect: ReviewAspect; average_score: number; suggestion: string }>> {
  const { data } = await apiClient.get<Array<{ aspect: ReviewAspect; average_score: number; suggestion: string }>>(`/sentiment-analyses/property/${encodeURIComponent(propertyId)}/suggestions`, { params: query });
  return data;
}

/** GET /sentiment-analyses/:id */
export async function findOne(id: string): Promise<SentimentAnalysis> {
  const { data } = await apiClient.get<SentimentAnalysis>(`/sentiment-analyses/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /sentiment-analyses/:id */
export async function update(id: string, body: UpdateSentimentAnalysisDto = {}): Promise<SentimentAnalysis> {
  const { data } = await apiClient.patch<SentimentAnalysis>(`/sentiment-analyses/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /sentiment-analyses/:id/acknowledge */
export async function acknowledgeAlert(id: string, body: AcknowledgeAlertDto = {}): Promise<SentimentAnalysis> {
  const { data } = await apiClient.patch<SentimentAnalysis>(`/sentiment-analyses/${encodeURIComponent(id)}/acknowledge`, body);
  return data;
}

/** DELETE /sentiment-analyses/:id */
export async function remove(id: string): Promise<SentimentAnalysis> {
  const { data } = await apiClient.delete<SentimentAnalysis>(`/sentiment-analyses/${encodeURIComponent(id)}`);
  return data;
}

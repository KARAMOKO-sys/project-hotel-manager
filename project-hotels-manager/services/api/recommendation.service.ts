// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/recommendation/controllers/recommendation.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AcceptRecommendationDto, ConversionStats, ConversionStatsQueryDto, CreateRecommendationDto, DismissRecommendationDto, GenerateRecommendationsDto, PaginatedResult, Recommendation, RecommendationFilterQueryDto, ScoreCandidatesDto, ScoredCandidate, UpdateRecommendationDto } from "@/types/api";

/** POST /recommendations */
export async function create(body: CreateRecommendationDto): Promise<Recommendation> {
  const { data } = await apiClient.post<Recommendation>("/recommendations", body);
  return data;
}

/** POST /recommendations/generate */
export async function generateForGuest(body: GenerateRecommendationsDto): Promise<Recommendation[]> {
  const { data } = await apiClient.post<Recommendation[]>("/recommendations/generate", body);
  return data;
}

/** POST /recommendations/score */
export async function scoreCandidates(body: ScoreCandidatesDto): Promise<ScoredCandidate[]> {
  const { data } = await apiClient.post<ScoredCandidate[]>("/recommendations/score", body);
  return data;
}

/** POST /recommendations/expire */
export async function expireOutdated(): Promise<{ expired: number }> {
  const { data } = await apiClient.post<{ expired: number }>("/recommendations/expire", undefined);
  return data;
}

/** GET /recommendations */
export async function findAll(query?: RecommendationFilterQueryDto): Promise<PaginatedResult<Recommendation>> {
  const { data } = await apiClient.get<PaginatedResult<Recommendation>>("/recommendations", { params: query });
  return data;
}

/** GET /recommendations/stats */
export async function getConversionStats(query?: ConversionStatsQueryDto): Promise<ConversionStats> {
  const { data } = await apiClient.get<ConversionStats>("/recommendations/stats", { params: query });
  return data;
}

/** GET /recommendations/guest/:guestId */
export async function findByGuest(guestId: string, query?: RecommendationFilterQueryDto): Promise<PaginatedResult<Recommendation>> {
  const { data } = await apiClient.get<PaginatedResult<Recommendation>>(`/recommendations/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /recommendations/guest/:guestId/active */
export async function getActiveForGuest(guestId: string): Promise<Recommendation[]> {
  const { data } = await apiClient.get<Recommendation[]>(`/recommendations/guest/${encodeURIComponent(guestId)}/active`);
  return data;
}

/** GET /recommendations/:id */
export async function findOne(id: string): Promise<Recommendation> {
  const { data } = await apiClient.get<Recommendation>(`/recommendations/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /recommendations/:id */
export async function update(id: string, body: UpdateRecommendationDto = {}): Promise<Recommendation> {
  const { data } = await apiClient.patch<Recommendation>(`/recommendations/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /recommendations/:id/shown */
export async function markAsShown(id: string): Promise<Recommendation> {
  const { data } = await apiClient.patch<Recommendation>(`/recommendations/${encodeURIComponent(id)}/shown`, undefined);
  return data;
}

/** PATCH /recommendations/:id/accept */
export async function accept(id: string, body: AcceptRecommendationDto = {}): Promise<Recommendation> {
  const { data } = await apiClient.patch<Recommendation>(`/recommendations/${encodeURIComponent(id)}/accept`, body);
  return data;
}

/** PATCH /recommendations/:id/dismiss */
export async function dismiss(id: string, body: DismissRecommendationDto = {}): Promise<Recommendation> {
  const { data } = await apiClient.patch<Recommendation>(`/recommendations/${encodeURIComponent(id)}/dismiss`, body);
  return data;
}

/** DELETE /recommendations/:id */
export async function remove(id: string): Promise<Recommendation> {
  const { data } = await apiClient.delete<Recommendation>(`/recommendations/${encodeURIComponent(id)}`);
  return data;
}

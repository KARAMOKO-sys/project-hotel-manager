// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/report/controllers/report.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateAndGenerateReportDto, CreateReportDto, DueReportsQueryDto, ExportReportQueryDto, GenerateReportDto, PaginatedResult, Report, ReportFilterQueryDto, ScheduleReportDto, UpdateReportDto } from "@/types/api";

/** POST /reports */
export async function create(body: CreateReportDto): Promise<Report> {
  const { data } = await apiClient.post<Report>("/reports", body);
  return data;
}

/** POST /reports/generate */
export async function createAndGenerate(body: CreateAndGenerateReportDto): Promise<Report> {
  const { data } = await apiClient.post<Report>("/reports/generate", body);
  return data;
}

/** GET /reports */
export async function findAll(query?: ReportFilterQueryDto): Promise<PaginatedResult<Report>> {
  const { data } = await apiClient.get<PaginatedResult<Report>>("/reports", { params: query });
  return data;
}

/** GET /reports/due */
export async function getDueReports(query?: DueReportsQueryDto): Promise<Report[]> {
  const { data } = await apiClient.get<Report[]>("/reports/due", { params: query });
  return data;
}

/** GET /reports/property/:propertyId */
export async function findByProperty(propertyId: string, query?: ReportFilterQueryDto): Promise<PaginatedResult<Report>> {
  const { data } = await apiClient.get<PaginatedResult<Report>>(`/reports/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /reports/:id */
export async function findOne(id: string): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/reports/${encodeURIComponent(id)}`);
  return data;
}

/** GET /reports/:id/export — Télécharge le rapport généré (en-têtes Content-Type / Content-Disposition). */
export async function exportReport(id: string, query?: ExportReportQueryDto): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/reports/${encodeURIComponent(id)}/export`, { params: query, responseType: "blob" });
  return data;
}

/** POST /reports/:id/generate */
export async function generate(id: string, body: GenerateReportDto): Promise<Report> {
  const { data } = await apiClient.post<Report>(`/reports/${encodeURIComponent(id)}/generate`, body);
  return data;
}

/** PATCH /reports/:id */
export async function update(id: string, body: UpdateReportDto = {}): Promise<Report> {
  const { data } = await apiClient.patch<Report>(`/reports/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /reports/:id/schedule */
export async function schedule(id: string, body: ScheduleReportDto): Promise<Report> {
  const { data } = await apiClient.patch<Report>(`/reports/${encodeURIComponent(id)}/schedule`, body);
  return data;
}

/** PATCH /reports/:id/unschedule */
export async function unschedule(id: string): Promise<Report> {
  const { data } = await apiClient.patch<Report>(`/reports/${encodeURIComponent(id)}/unschedule`, undefined);
  return data;
}

/** DELETE /reports/:id */
export async function remove(id: string): Promise<Report> {
  const { data } = await apiClient.delete<Report>(`/reports/${encodeURIComponent(id)}`);
  return data;
}

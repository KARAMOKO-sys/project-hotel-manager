// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/housekeeping-staff/controllers/housekeeping-staff.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AssignSupervisorDto, ChangeHousekeepingPasswordDto, CreateHousekeepingStaffDto, HousekeepingPerformance, HousekeepingStaff, HousekeepingStatus, HousekeepingWorkload, MonthlyTargetDto, PaginatedResult, PaginationQueryDto, RecordCleaningDto, ReportIssueDto, SetHousekeepingStatusDto, SuspendHousekeepingStaffDto, UpdateHousekeepingScheduleDto, UpdateHousekeepingStaffDto } from "@/types/api";

/** POST /housekeeping-staff */
export async function create(body: CreateHousekeepingStaffDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.post<HousekeepingStaff>("/housekeeping-staff", body);
  return data;
}

/** GET /housekeeping-staff */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<HousekeepingStaff>> {
  const { data } = await apiClient.get<PaginatedResult<HousekeepingStaff>>("/housekeeping-staff", { params: query });
  return data;
}

/** GET /housekeeping-staff/search */
export async function search(query: { q: string }): Promise<HousekeepingStaff[]> {
  const { data } = await apiClient.get<HousekeepingStaff[]>("/housekeeping-staff/search", { params: query });
  return data;
}

/** GET /housekeeping-staff/email/:email */
export async function findByEmail(email: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.get<HousekeepingStaff>(`/housekeeping-staff/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /housekeeping-staff/employee/:code */
export async function findByEmployeeCode(code: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.get<HousekeepingStaff>(`/housekeeping-staff/employee/${encodeURIComponent(code)}`);
  return data;
}

/** GET /housekeeping-staff/specialization/:specialization */
export async function findBySpecialization(specialization: string, query?: PaginationQueryDto): Promise<PaginatedResult<HousekeepingStaff>> {
  const { data } = await apiClient.get<PaginatedResult<HousekeepingStaff>>(`/housekeeping-staff/specialization/${encodeURIComponent(specialization)}`, { params: query });
  return data;
}

/** GET /housekeeping-staff/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto & { status?: HousekeepingStatus }): Promise<PaginatedResult<HousekeepingStaff>> {
  const { data } = await apiClient.get<PaginatedResult<HousekeepingStaff>>(`/housekeeping-staff/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /housekeeping-staff/property/:propertyId/available */
export async function findAvailable(propertyId: string, query?: { at?: string }): Promise<HousekeepingStaff[]> {
  const { data } = await apiClient.get<HousekeepingStaff[]>(`/housekeeping-staff/property/${encodeURIComponent(propertyId)}/available`, { params: query });
  return data;
}

/** PATCH /housekeeping-staff/property/:propertyId/reset-daily */
export async function resetDailyCounters(propertyId: string): Promise<{ modified: number }> {
  const { data } = await apiClient.patch<{ modified: number }>(`/housekeeping-staff/property/${encodeURIComponent(propertyId)}/reset-daily`, undefined);
  return data;
}

/** PATCH /housekeeping-staff/property/:propertyId/reset-monthly */
export async function resetMonthlyCounters(propertyId: string): Promise<{ modified: number }> {
  const { data } = await apiClient.patch<{ modified: number }>(`/housekeeping-staff/property/${encodeURIComponent(propertyId)}/reset-monthly`, undefined);
  return data;
}

/** GET /housekeeping-staff/:id */
export async function findOne(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.get<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}`);
  return data;
}

/** GET /housekeeping-staff/:id/workload */
export async function getWorkload(id: string): Promise<HousekeepingWorkload> {
  const { data } = await apiClient.get<HousekeepingWorkload>(`/housekeeping-staff/${encodeURIComponent(id)}/workload`);
  return data;
}

/** GET /housekeeping-staff/:id/performance */
export async function getPerformance(id: string): Promise<HousekeepingPerformance> {
  const { data } = await apiClient.get<HousekeepingPerformance>(`/housekeeping-staff/${encodeURIComponent(id)}/performance`);
  return data;
}

/** PATCH /housekeeping-staff/:id */
export async function update(id: string, body: UpdateHousekeepingStaffDto = {}): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/activate */
export async function activate(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /housekeeping-staff/:id/deactivate */
export async function deactivate(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /housekeeping-staff/:id/suspend */
export async function suspend(id: string, body: SuspendHousekeepingStaffDto = {}): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/reactivate */
export async function reactivate(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /housekeeping-staff/:id/status */
export async function setStatus(id: string, body: SetHousekeepingStatusDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/status`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/password */
export async function changePassword(id: string, body: ChangeHousekeepingPasswordDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/schedule */
export async function updateSchedule(id: string, body: UpdateHousekeepingScheduleDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/schedule`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/supervisor */
export async function assignSupervisor(id: string, body: AssignSupervisorDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/supervisor`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/monthly-target */
export async function setMonthlyTarget(id: string, body: MonthlyTargetDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/monthly-target`, body);
  return data;
}

/** POST /housekeeping-staff/:id/cleanings */
export async function recordCleaning(id: string, body: RecordCleaningDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.post<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/cleanings`, body);
  return data;
}

/** POST /housekeeping-staff/:id/issues */
export async function reportIssue(id: string, body: ReportIssueDto): Promise<HousekeepingStaff> {
  const { data } = await apiClient.post<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/issues`, body);
  return data;
}

/** PATCH /housekeeping-staff/:id/restore */
export async function restore(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.patch<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /housekeeping-staff/:id */
export async function remove(id: string): Promise<HousekeepingStaff> {
  const { data } = await apiClient.delete<HousekeepingStaff>(`/housekeeping-staff/${encodeURIComponent(id)}`);
  return data;
}

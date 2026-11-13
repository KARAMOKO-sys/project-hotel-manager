// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/receptionist/controllers/receptionist.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ChangeReceptionistPasswordDto, CreateReceptionistDto, PaginatedResult, PaginationQueryDto, Receptionist, ReceptionistPerformance, ReceptionistShiftType, ReceptionistStatus, RecordReceptionistActivityDto, SatisfactionScoreDto, SetReceptionistStatusDto, SuspendReceptionistDto, UpdateReceptionistDto, UpdateReceptionistScheduleDto } from "@/types/api";

/** POST /receptionists */
export async function create(body: CreateReceptionistDto): Promise<Receptionist> {
  const { data } = await apiClient.post<Receptionist>("/receptionists", body);
  return data;
}

/** GET /receptionists */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Receptionist>> {
  const { data } = await apiClient.get<PaginatedResult<Receptionist>>("/receptionists", { params: query });
  return data;
}

/** GET /receptionists/search */
export async function search(query: { q: string }): Promise<Receptionist[]> {
  const { data } = await apiClient.get<Receptionist[]>("/receptionists/search", { params: query });
  return data;
}

/** GET /receptionists/on-duty */
export async function findOnDuty(query?: { propertyId?: string }): Promise<Receptionist[]> {
  const { data } = await apiClient.get<Receptionist[]>("/receptionists/on-duty", { params: query });
  return data;
}

/** GET /receptionists/email/:email */
export async function findByEmail(email: string): Promise<Receptionist> {
  const { data } = await apiClient.get<Receptionist>(`/receptionists/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /receptionists/employee/:code */
export async function findByEmployeeCode(code: string): Promise<Receptionist> {
  const { data } = await apiClient.get<Receptionist>(`/receptionists/employee/${encodeURIComponent(code)}`);
  return data;
}

/** GET /receptionists/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto & { status?: ReceptionistStatus }): Promise<PaginatedResult<Receptionist>> {
  const { data } = await apiClient.get<PaginatedResult<Receptionist>>(`/receptionists/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /receptionists/property/:propertyId/schedule/:day */
export async function findScheduledOn(propertyId: string, day: string): Promise<Receptionist[]> {
  const { data } = await apiClient.get<Receptionist[]>(`/receptionists/property/${encodeURIComponent(propertyId)}/schedule/${encodeURIComponent(day)}`);
  return data;
}

/** GET /receptionists/:id */
export async function findOne(id: string): Promise<Receptionist> {
  const { data } = await apiClient.get<Receptionist>(`/receptionists/${encodeURIComponent(id)}`);
  return data;
}

/** GET /receptionists/:id/schedule */
export async function getSchedule(id: string): Promise<{ shift_type?: ReceptionistShiftType; shift_schedule: undefined | { monday?: { start: string; end: string }; tuesday?: { start: string; end: string }; wednesday?: { start: string; end: string }; thursday?: { start: string; end: string }; friday?: { start: string; end: string }; saturday?: { start: string; end: string }; sunday?: { start: string; end: string } }; working_days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"> }> {
  const { data } = await apiClient.get<{ shift_type?: ReceptionistShiftType; shift_schedule: undefined | { monday?: { start: string; end: string }; tuesday?: { start: string; end: string }; wednesday?: { start: string; end: string }; thursday?: { start: string; end: string }; friday?: { start: string; end: string }; saturday?: { start: string; end: string }; sunday?: { start: string; end: string } }; working_days: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"> }>(`/receptionists/${encodeURIComponent(id)}/schedule`);
  return data;
}

/** GET /receptionists/:id/performance */
export async function getPerformance(id: string): Promise<ReceptionistPerformance> {
  const { data } = await apiClient.get<ReceptionistPerformance>(`/receptionists/${encodeURIComponent(id)}/performance`);
  return data;
}

/** GET /receptionists/:id/discount-check */
export async function checkDiscount(id: string, query: { percentage: number }): Promise<{ allowed: boolean; max_discount_percent: number }> {
  const { data } = await apiClient.get<{ allowed: boolean; max_discount_percent: number }>(`/receptionists/${encodeURIComponent(id)}/discount-check`, { params: query });
  return data;
}

/** PATCH /receptionists/:id */
export async function update(id: string, body: UpdateReceptionistDto = {}): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /receptionists/:id/activate */
export async function activate(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /receptionists/:id/deactivate */
export async function deactivate(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /receptionists/:id/suspend */
export async function suspend(id: string, body: SuspendReceptionistDto = {}): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /receptionists/:id/reactivate */
export async function reactivate(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /receptionists/:id/status */
export async function setStatus(id: string, body: SetReceptionistStatusDto): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/status`, body);
  return data;
}

/** PATCH /receptionists/:id/password */
export async function changePassword(id: string, body: ChangeReceptionistPasswordDto): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /receptionists/:id/shift/start */
export async function startShift(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/shift/start`, undefined);
  return data;
}

/** PATCH /receptionists/:id/shift/end */
export async function endShift(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/shift/end`, undefined);
  return data;
}

/** PATCH /receptionists/:id/schedule */
export async function updateSchedule(id: string, body: UpdateReceptionistScheduleDto): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/schedule`, body);
  return data;
}

/** POST /receptionists/:id/activities */
export async function recordActivity(id: string, body: RecordReceptionistActivityDto): Promise<Receptionist> {
  const { data } = await apiClient.post<Receptionist>(`/receptionists/${encodeURIComponent(id)}/activities`, body);
  return data;
}

/** POST /receptionists/:id/satisfaction */
export async function updateSatisfactionScore(id: string, body: SatisfactionScoreDto): Promise<Receptionist> {
  const { data } = await apiClient.post<Receptionist>(`/receptionists/${encodeURIComponent(id)}/satisfaction`, body);
  return data;
}

/** PATCH /receptionists/:id/restore */
export async function restore(id: string): Promise<Receptionist> {
  const { data } = await apiClient.patch<Receptionist>(`/receptionists/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /receptionists/:id */
export async function remove(id: string): Promise<Receptionist> {
  const { data } = await apiClient.delete<Receptionist>(`/receptionists/${encodeURIComponent(id)}`);
  return data;
}

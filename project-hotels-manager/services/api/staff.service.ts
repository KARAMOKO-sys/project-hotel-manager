// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/staff/controllers/staff.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AssignStaffManagerDto, CreateStaffDto, EmploymentStatus, PaginatedResult, PaginationQueryDto, Staff, StaffDepartment, StaffHeadcount, StaffStatusReasonDto, TerminateStaffDto, TransferStaffDto, UpdateStaffDto, UpdateStaffScheduleDto } from "@/types/api";

/** POST /staff */
export async function create(body: CreateStaffDto): Promise<Staff> {
  const { data } = await apiClient.post<Staff>("/staff", body);
  return data;
}

/** GET /staff */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Staff>> {
  const { data } = await apiClient.get<PaginatedResult<Staff>>("/staff", { params: query });
  return data;
}

/** GET /staff/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto & { department?: StaffDepartment; status?: EmploymentStatus }): Promise<PaginatedResult<Staff>> {
  const { data } = await apiClient.get<PaginatedResult<Staff>>(`/staff/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /staff/property/:propertyId/headcount */
export async function getHeadcount(propertyId: string): Promise<StaffHeadcount> {
  const { data } = await apiClient.get<StaffHeadcount>(`/staff/property/${encodeURIComponent(propertyId)}/headcount`);
  return data;
}

/** GET /staff/property/:propertyId/schedule/:day */
export async function findScheduledOn(propertyId: string, day: string): Promise<Staff[]> {
  const { data } = await apiClient.get<Staff[]>(`/staff/property/${encodeURIComponent(propertyId)}/schedule/${encodeURIComponent(day)}`);
  return data;
}

/** GET /staff/organization/:organizationId */
export async function findByOrganization(organizationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Staff>> {
  const { data } = await apiClient.get<PaginatedResult<Staff>>(`/staff/organization/${encodeURIComponent(organizationId)}`, { params: query });
  return data;
}

/** GET /staff/user/:userId */
export async function findByUser(userId: string): Promise<Staff[]> {
  const { data } = await apiClient.get<Staff[]>(`/staff/user/${encodeURIComponent(userId)}`);
  return data;
}

/** GET /staff/:id */
export async function findOne(id: string): Promise<Staff> {
  const { data } = await apiClient.get<Staff>(`/staff/${encodeURIComponent(id)}`);
  return data;
}

/** GET /staff/:id/reports */
export async function getDirectReports(id: string): Promise<Staff[]> {
  const { data } = await apiClient.get<Staff[]>(`/staff/${encodeURIComponent(id)}/reports`);
  return data;
}

/** PATCH /staff/:id */
export async function update(id: string, body: UpdateStaffDto = {}): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /staff/:id/manager */
export async function assignManager(id: string, body: AssignStaffManagerDto): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/manager`, body);
  return data;
}

/** PATCH /staff/:id/schedule */
export async function updateSchedule(id: string, body: UpdateStaffScheduleDto): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/schedule`, body);
  return data;
}

/** PATCH /staff/:id/leave */
export async function putOnLeave(id: string, body: StaffStatusReasonDto = {}): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/leave`, body);
  return data;
}

/** PATCH /staff/:id/return */
export async function returnFromLeave(id: string): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/return`, undefined);
  return data;
}

/** PATCH /staff/:id/suspend */
export async function suspend(id: string, body: StaffStatusReasonDto = {}): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /staff/:id/reactivate */
export async function reactivate(id: string): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /staff/:id/terminate */
export async function terminate(id: string, body: TerminateStaffDto): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/terminate`, body);
  return data;
}

/** PATCH /staff/:id/transfer */
export async function transfer(id: string, body: TransferStaffDto): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/transfer`, body);
  return data;
}

/** PATCH /staff/:id/restore */
export async function restore(id: string): Promise<Staff> {
  const { data } = await apiClient.patch<Staff>(`/staff/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /staff/:id */
export async function remove(id: string): Promise<Staff> {
  const { data } = await apiClient.delete<Staff>(`/staff/${encodeURIComponent(id)}`);
  return data;
}

import { apiClient } from "./client";
import type { SiteConfig, SiteConfigResponse } from "@/types/site-config";

export async function getPublic(): Promise<SiteConfigResponse> {
  const { data } = await apiClient.get<SiteConfigResponse>("/site-config");
  return data;
}

export async function update(config: SiteConfig): Promise<SiteConfigResponse> {
  const { data } = await apiClient.patch<SiteConfigResponse>("/site-config", {
    config,
  });
  return data;
}

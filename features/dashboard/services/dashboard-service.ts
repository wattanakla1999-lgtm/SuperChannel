import { apiClient } from "@/lib/http/api-client";
import type {
  DashboardAgentsResponse,
  DashboardOverviewResponse,
  DashboardQuery,
  DashboardTrendsResponse,
} from "../types/dashboard";

function buildParams(query: DashboardQuery) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!value || value === "all") {
      continue;
    }

    params.set(key, String(value));
  }

  return params;
}

export async function getDashboardOverview(query: DashboardQuery) {
  const response = await apiClient.get<DashboardOverviewResponse>("/api/dashboard/overview", {
    params: buildParams(query),
  });

  return response.data.overview;
}

export async function getDashboardTrends(query: DashboardQuery) {
  const response = await apiClient.get<DashboardTrendsResponse>("/api/dashboard/trends", {
    params: buildParams(query),
  });

  return response.data.charts;
}

export async function getDashboardAgents(query: DashboardQuery) {
  const response = await apiClient.get<DashboardAgentsResponse>("/api/dashboard/agents", {
    params: buildParams(query),
  });

  return response.data.agents;
}

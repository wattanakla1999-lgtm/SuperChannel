import { apiClient } from "@/lib/http/api-client";
import type {
  IntegrationActionResponse,
  IntegrationProvider,
  IntegrationsResponse,
} from "../types/integrations";

export async function getIntegrations() {
  const response = await apiClient.get<IntegrationsResponse>("/api/integrations");
  return response.data.integrations;
}

export async function connectIntegration(
  provider: IntegrationProvider,
  accountId: string,
) {
  const response = await apiClient.post<IntegrationActionResponse>(
    `/api/integrations/${provider}/connect`,
    { accountId },
  );
  return response.data;
}

export async function testIntegration(provider: IntegrationProvider) {
  const response = await apiClient.post<IntegrationActionResponse>(
    `/api/integrations/${provider}/test`,
  );
  return response.data;
}

export async function reconnectIntegration(provider: IntegrationProvider) {
  const response = await apiClient.post<IntegrationActionResponse>(
    `/api/integrations/${provider}/reconnect`,
  );
  return response.data;
}

export async function disconnectIntegration(provider: IntegrationProvider) {
  const response = await apiClient.delete<IntegrationActionResponse>(
    `/api/integrations/${provider}`,
  );
  return response.data;
}

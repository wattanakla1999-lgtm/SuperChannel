import "server-only";

import { prisma } from "@/server/database/prisma";
import type { IntegrationProvider } from "@/features/integrations/types/integrations";
import type { AuthenticatedSession } from "@/server/auth/session";
import { isOwnerOrAdmin } from "@/server/auth/roles";

function assertManageIntegrations(session: AuthenticatedSession) {
  if (!isOwnerOrAdmin(session)) {
    const error = new Error("Only Owners and Admins can manage integrations.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

function toProviderEnum(provider: IntegrationProvider) {
  return provider.toUpperCase().replace("-", "_") as
    | "LINE"
    | "FACEBOOK"
    | "INSTAGRAM"
    | "TELEGRAM"
    | "X"
    | "TIKTOK"
    | "SHOPEE"
    | "LAZADA"
    | "TIKTOK_SHOP";
}

function mapIntegration(integration: {
  accountName: string | null;
  availableAccounts: unknown;
  capabilities: Array<"INBOX" | "PUBLISHING">;
  lastCheckedAt: Date | null;
  permissionsHint: string;
  providerName: string;
  requiredAccountType: string;
  status: "CONNECTED" | "DISCONNECTED" | "EXPIRED" | "ERROR" | "COMING_SOON";
  provider: string;
}) {
  return {
    accountName: integration.accountName,
    availableAccounts: integration.availableAccounts as Array<{ id: string; label: string }>,
    capabilities: integration.capabilities.map((capability) => capability.toLowerCase()) as Array<"inbox" | "publishing">,
    id: integration.provider.toLowerCase().replace("_", "-") as IntegrationProvider,
    lastCheckedAt: integration.lastCheckedAt?.toISOString() ?? null,
    permissionsHint: integration.permissionsHint,
    providerName: integration.providerName,
    requiredAccountType: integration.requiredAccountType,
    status: integration.status.toLowerCase() as "connected" | "disconnected" | "expired" | "error" | "coming_soon",
  };
}

async function getIntegration(session: AuthenticatedSession, provider: IntegrationProvider) {
  return prisma.integration.findFirst({
    where: {
      organizationId: session.organizationId,
      provider: toProviderEnum(provider),
    },
  });
}

export async function listIntegrationsFromDatabase(session: AuthenticatedSession) {
  const integrations = await prisma.integration.findMany({
    orderBy: { provider: "asc" },
    where: {
      organizationId: session.organizationId,
    },
  });

  return integrations.map(mapIntegration);
}

export async function connectIntegrationInDatabase(
  session: AuthenticatedSession,
  provider: IntegrationProvider,
  accountId: string,
) {
  assertManageIntegrations(session);

  const integration = await getIntegration(session, provider);

  if (!integration) {
    return null;
  }

  const availableAccounts = integration.availableAccounts as Array<{ id: string; label: string }>;
  const account = availableAccounts.find((item) => item.id === accountId);

  if (!account) {
    const error = new Error("Please select an available business account.");
    error.name = "INVALID_REQUEST";
    throw error;
  }

  const updated = await prisma.integration.update({
    data: {
      accountName: account.label,
      lastCheckedAt: new Date(),
      status: "CONNECTED",
    },
    where: { id: integration.id },
  });

  return {
    integration: mapIntegration(updated),
    message: `${updated.providerName} connected successfully.`,
  };
}

export async function testIntegrationInDatabase(
  session: AuthenticatedSession,
  provider: IntegrationProvider,
) {
  const integration = await getIntegration(session, provider);

  if (!integration) {
    return null;
  }

  const updated = await prisma.integration.update({
    data: {
      lastCheckedAt: new Date(),
      status: integration.status === "DISCONNECTED" ? "ERROR" : integration.status,
    },
    where: { id: integration.id },
  });

  return {
    integration: mapIntegration(updated),
    message:
      updated.status === "CONNECTED"
        ? `${updated.providerName} connection test passed.`
        : `${updated.providerName} is not connected yet.`,
  };
}

export async function reconnectIntegrationInDatabase(
  session: AuthenticatedSession,
  provider: IntegrationProvider,
) {
  assertManageIntegrations(session);

  const integration = await getIntegration(session, provider);

  if (!integration) {
    return null;
  }

  const updated = await prisma.integration.update({
    data: {
      lastCheckedAt: new Date(),
      status: "CONNECTED",
    },
    where: { id: integration.id },
  });

  return {
    integration: mapIntegration(updated),
    message: `${updated.providerName} reconnected successfully.`,
  };
}

export async function disconnectIntegrationInDatabase(
  session: AuthenticatedSession,
  provider: IntegrationProvider,
) {
  assertManageIntegrations(session);

  const integration = await getIntegration(session, provider);

  if (!integration) {
    return null;
  }

  const updated = await prisma.integration.update({
    data: {
      accountName: null,
      lastCheckedAt: new Date(),
      status: "DISCONNECTED",
    },
    where: { id: integration.id },
  });

  return {
    integration: mapIntegration(updated),
    message: `${updated.providerName} disconnected.`,
  };
}

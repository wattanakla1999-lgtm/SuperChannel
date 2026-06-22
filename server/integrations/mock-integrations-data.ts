import "server-only";

import type {
  IntegrationAccountOption,
  IntegrationActionResponse,
  IntegrationCapability,
  IntegrationProvider,
  IntegrationRecord,
  IntegrationStatus,
} from "@/features/integrations/types/integrations";
import type { PublishingChannel } from "@/features/publishing/types/publishing";

type StoredIntegration = {
  accountName: string | null;
  availableAccounts: IntegrationAccountOption[];
  capabilities: IntegrationCapability[];
  id: IntegrationProvider;
  lastCheckedAt: string | null;
  permissionsHint: string;
  providerName: string;
  requiredAccountType: string;
  status: IntegrationStatus;
};

function createInitialIntegrationStore() {
  return new Map<IntegrationProvider, StoredIntegration>([
    [
      "line",
      {
        accountName: null,
        availableAccounts: [
          { id: "line-main", label: "SuperChannel Support OA" },
          { id: "line-sales", label: "SuperChannel Sales OA" },
        ],
        capabilities: ["inbox"],
        id: "line",
        lastCheckedAt: null,
        permissionsHint: "Requires messaging, webhook, and profile access.",
        providerName: "LINE Official Account",
        requiredAccountType: "Verified LINE Official Account",
        status: "disconnected",
      },
    ],
    [
      "facebook",
      {
        accountName: "SuperChannel Main Page",
        availableAccounts: [{ id: "fb-main", label: "SuperChannel Main Page" }],
        capabilities: ["inbox", "publishing"],
        id: "facebook",
        lastCheckedAt: "2026-06-21T09:30:00.000Z",
        permissionsHint: "Requires page messaging, comments, and publishing scopes.",
        providerName: "Facebook Page",
        requiredAccountType: "Facebook Page with business admin access",
        status: "connected",
      },
    ],
    [
      "instagram",
      {
        accountName: "superchannel.studio",
        availableAccounts: [
          { id: "ig-studio", label: "superchannel.studio" },
          { id: "ig-labs", label: "superchannel.labs" },
        ],
        capabilities: ["publishing"],
        id: "instagram",
        lastCheckedAt: "2026-06-21T09:26:00.000Z",
        permissionsHint: "Requires a professional account linked to a Facebook Page.",
        providerName: "Instagram Professional Account",
        requiredAccountType: "Instagram professional account",
        status: "connected",
      },
    ],
    [
      "telegram",
      {
        accountName: "@superchannel_ops_bot",
        availableAccounts: [
          { id: "tg-ops", label: "@superchannel_ops_bot" },
          { id: "tg-promo", label: "@superchannel_promo_bot" },
        ],
        capabilities: ["inbox", "publishing"],
        id: "telegram",
        lastCheckedAt: "2026-06-21T08:55:00.000Z",
        permissionsHint: "Requires bot access and channel admin posting rights.",
        providerName: "Telegram Bot",
        requiredAccountType: "Telegram bot plus channel admin access",
        status: "connected",
      },
    ],
    [
      "x",
      {
        accountName: "@superchannelapp",
        availableAccounts: [{ id: "x-main", label: "@superchannelapp" }],
        capabilities: ["publishing"],
        id: "x",
        lastCheckedAt: "2026-06-20T18:00:00.000Z",
        permissionsHint: "Requires read-write app permissions for the workspace handle.",
        providerName: "X",
        requiredAccountType: "X account with app write permissions",
        status: "expired",
      },
    ],
    [
      "tiktok",
      {
        accountName: "SuperChannel Creators",
        availableAccounts: [
          { id: "tt-main", label: "SuperChannel Creators" },
          { id: "tt-labs", label: "SuperChannel Labs" },
        ],
        capabilities: ["publishing"],
        id: "tiktok",
        lastCheckedAt: "2026-06-21T07:35:00.000Z",
        permissionsHint: "Requires a TikTok business account with content posting enabled.",
        providerName: "TikTok",
        requiredAccountType: "TikTok business account",
        status: "error",
      },
    ],
    [
      "shopee",
      {
        accountName: null,
        availableAccounts: [],
        capabilities: ["inbox"],
        id: "shopee",
        lastCheckedAt: null,
        permissionsHint: "Marketplace support is not yet available in this mock.",
        providerName: "Shopee",
        requiredAccountType: "Coming soon",
        status: "coming_soon",
      },
    ],
    [
      "lazada",
      {
        accountName: null,
        availableAccounts: [],
        capabilities: ["inbox"],
        id: "lazada",
        lastCheckedAt: null,
        permissionsHint: "Marketplace support is not yet available in this mock.",
        providerName: "Lazada",
        requiredAccountType: "Coming soon",
        status: "coming_soon",
      },
    ],
    [
      "tiktok-shop",
      {
        accountName: null,
        availableAccounts: [],
        capabilities: ["inbox", "publishing"],
        id: "tiktok-shop",
        lastCheckedAt: null,
        permissionsHint: "Commerce support is not yet available in this mock.",
        providerName: "TikTok Shop",
        requiredAccountType: "Coming soon",
        status: "coming_soon",
      },
    ],
  ]);
}

const sessionIntegrationStores = new Map<
  string,
  Map<IntegrationProvider, StoredIntegration>
>();

function getSessionIntegrationStore(sessionId: string) {
  const existing = sessionIntegrationStores.get(sessionId);

  if (existing) {
    return existing;
  }

  const nextStore = createInitialIntegrationStore();
  sessionIntegrationStores.set(sessionId, nextStore);
  return nextStore;
}

function cloneIntegration(integration: StoredIntegration): IntegrationRecord {
  return {
    accountName: integration.accountName,
    availableAccounts: integration.availableAccounts.map((account) => ({
      ...account,
    })),
    capabilities: [...integration.capabilities],
    id: integration.id,
    lastCheckedAt: integration.lastCheckedAt,
    permissionsHint: integration.permissionsHint,
    providerName: integration.providerName,
    requiredAccountType: integration.requiredAccountType,
    status: integration.status,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function assertAvailableProvider(
  sessionId: string,
  provider: IntegrationProvider,
) {
  const integration = getSessionIntegrationStore(sessionId).get(provider);

  if (!integration) {
    return null;
  }

  if (integration.status === "coming_soon") {
    return null;
  }

  return integration;
}

export async function listMockIntegrations(sessionId: string) {
  return Array.from(getSessionIntegrationStore(sessionId).values()).map(
    cloneIntegration,
  );
}

export async function connectMockIntegration(
  sessionId: string,
  provider: IntegrationProvider,
  accountId: string,
): Promise<IntegrationActionResponse | null> {
  const integration = assertAvailableProvider(sessionId, provider);

  if (!integration) {
    return null;
  }

  const account =
    integration.availableAccounts.find((item) => item.id === accountId) ?? null;

  if (!account) {
    return null;
  }

  integration.accountName = account.label;
  integration.lastCheckedAt = nowIso();
  integration.status = "connected";

  return {
    integration: cloneIntegration(integration),
    message: `${integration.providerName} connected successfully`,
  };
}

export async function testMockIntegration(
  sessionId: string,
  provider: IntegrationProvider,
): Promise<IntegrationActionResponse | null> {
  const integration = assertAvailableProvider(sessionId, provider);

  if (!integration) {
    return null;
  }

  integration.lastCheckedAt = nowIso();

  if (integration.status === "error") {
    integration.status = "connected";
    return {
      integration: cloneIntegration(integration),
      message: `${integration.providerName} test passed after retry`,
    };
  }

  return {
    integration: cloneIntegration(integration),
    message: `${integration.providerName} test completed successfully`,
  };
}

export async function reconnectMockIntegration(
  sessionId: string,
  provider: IntegrationProvider,
): Promise<IntegrationActionResponse | null> {
  const integration = assertAvailableProvider(sessionId, provider);

  if (!integration) {
    return null;
  }

  integration.lastCheckedAt = nowIso();
  integration.status = "connected";
  integration.accountName =
    integration.accountName ?? integration.availableAccounts[0]?.label ?? null;

  return {
    integration: cloneIntegration(integration),
    message: `${integration.providerName} reconnected successfully`,
  };
}

export async function disconnectMockIntegration(
  sessionId: string,
  provider: IntegrationProvider,
): Promise<IntegrationActionResponse | null> {
  const integration = assertAvailableProvider(sessionId, provider);

  if (!integration) {
    return null;
  }

  integration.accountName = null;
  integration.lastCheckedAt = nowIso();
  integration.status = "disconnected";

  return {
    integration: cloneIntegration(integration),
    message: `${integration.providerName} disconnected`,
  };
}

const publishingProviderMap: Record<PublishingChannel, IntegrationProvider> = {
  Facebook: "facebook",
  Instagram: "instagram",
  Telegram: "telegram",
  TikTok: "tiktok",
  X: "x",
};

export async function listPublishingEnabledChannels(sessionId: string) {
  return (Object.entries(publishingProviderMap) as Array<
    [PublishingChannel, IntegrationProvider]
  >)
    .filter(
      ([, provider]) =>
        getSessionIntegrationStore(sessionId).get(provider)?.status !==
        "disconnected",
    )
    .map(([channel]) => channel);
}

export type IntegrationCapability = "inbox" | "publishing";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "error"
  | "coming_soon";

export type IntegrationProvider =
  | "line"
  | "facebook"
  | "instagram"
  | "telegram"
  | "x"
  | "tiktok"
  | "shopee"
  | "lazada"
  | "tiktok-shop";

export type IntegrationAccountOption = {
  id: string;
  label: string;
};

export type IntegrationRecord = {
  accountName: string | null;
  capabilities: IntegrationCapability[];
  availableAccounts: IntegrationAccountOption[];
  id: IntegrationProvider;
  lastCheckedAt: string | null;
  permissionsHint: string;
  providerName: string;
  requiredAccountType: string;
  status: IntegrationStatus;
};

export type IntegrationsResponse = {
  integrations: IntegrationRecord[];
};

export type IntegrationActionResponse = {
  integration: IntegrationRecord;
  message: string;
};

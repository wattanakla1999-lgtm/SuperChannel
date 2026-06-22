import "server-only";

function readRequiredServerEnv(
  name:
    | "DATABASE_URL"
    | "DIRECT_URL"
    | "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    | "NEXT_PUBLIC_SUPABASE_URL",
) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

function readOptionalServerEnv(name: "SUPABASE_SERVICE_ROLE_KEY") {
  return process.env[name] ?? null;
}

function readOptionalIntegrationEnv(
  name:
    | "LINE_API_BASE_URL"
    | "LINE_CHANNEL_ACCESS_TOKEN"
    | "LINE_CHANNEL_SECRET"
    | "SUPABASE_STORAGE_BUCKET_ATTACHMENTS",
) {
  return process.env[name] ?? null;
}

export const serverEnv = {
  credentialEncryptionKey: readRequiredServerEnv("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"),
  databaseUrl: readRequiredServerEnv("DATABASE_URL"),
  directUrl: readRequiredServerEnv("DIRECT_URL"),
  lineApiBaseUrl: readOptionalIntegrationEnv("LINE_API_BASE_URL"),
  lineChannelAccessToken: readOptionalIntegrationEnv("LINE_CHANNEL_ACCESS_TOKEN"),
  lineChannelSecret: readOptionalIntegrationEnv("LINE_CHANNEL_SECRET"),
  storageAttachmentsBucket:
    readOptionalIntegrationEnv("SUPABASE_STORAGE_BUCKET_ATTACHMENTS") ?? "message-attachments",
  supabaseAnonKey: readRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseUrl: readRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
} as const;

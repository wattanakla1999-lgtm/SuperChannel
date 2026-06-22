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

export const serverEnv = {
  credentialEncryptionKey: readRequiredServerEnv("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"),
  databaseUrl: readRequiredServerEnv("DATABASE_URL"),
  directUrl: readRequiredServerEnv("DIRECT_URL"),
  supabaseAnonKey: readRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseUrl: readRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
} as const;

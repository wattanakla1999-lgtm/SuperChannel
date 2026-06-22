function readRequiredClientEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required client environment variable: ${name}`);
  }

  return value;
}

export const clientEnv = {
  supabaseAnonKey: readRequiredClientEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseUrl: readRequiredClientEnv("NEXT_PUBLIC_SUPABASE_URL"),
} as const;

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env/client";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey,
  );
}

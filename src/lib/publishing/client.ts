import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.ts";

export function createPublishingSupabaseClient(
  url: string,
  secretKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

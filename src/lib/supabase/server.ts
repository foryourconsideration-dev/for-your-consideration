import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.ts";

export interface SupabaseServerEnvironment {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}

let client: SupabaseClient<Database> | undefined;

function requireEnvironmentValue(
  environment: SupabaseServerEnvironment,
  name: keyof SupabaseServerEnvironment,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    if (name === "SUPABASE_PUBLISHABLE_KEY") {
      throw new Error(
        "Missing SUPABASE_PUBLISHABLE_KEY. For a local build, add the target project's sb_publishable_... key to the ignored .env.local file. Never put SUPABASE_SECRET_KEY in the build file.",
      );
    }

    throw new Error(
      "Missing SUPABASE_URL. For a local build, add the target project's URL to the ignored .env.local file. Build configuration is separate from the privileged .env.publish.* files.",
    );
  }

  return value;
}

export function createServerSupabaseClient(
  environment: SupabaseServerEnvironment,
): SupabaseClient<Database> {
  const url = requireEnvironmentValue(environment, "SUPABASE_URL");
  const publishableKey = requireEnvironmentValue(
    environment,
    "SUPABASE_PUBLISHABLE_KEY",
  );

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  }

  return createClient<Database>(parsedUrl.toString(), publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getServerSupabaseClient(): SupabaseClient<Database> {
  client ??= createServerSupabaseClient(import.meta.env);
  return client;
}

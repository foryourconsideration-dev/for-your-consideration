import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

export type PublishingEnvironmentName = "preview" | "production";

export interface PublishingEnvironment {
  deployHookUrl: string | null;
  name: PublishingEnvironmentName;
  supabaseSecretKey: string;
  supabaseUrl: string;
}

export class PublishingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishingConfigurationError";
  }
}

function requireValue(
  values: Record<string, string | undefined>,
  name: string,
  fileName: string,
) {
  const value = values[name]?.trim();

  if (!value) {
    throw new PublishingConfigurationError(`${fileName} is missing ${name}.`);
  }

  return value;
}

function requireHttpsUrl(value: string, name: string, fileName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new PublishingConfigurationError(
      `${name} in ${fileName} must be a valid HTTPS URL.`,
    );
  }

  if (url.protocol !== "https:") {
    throw new PublishingConfigurationError(
      `${name} in ${fileName} must be a valid HTTPS URL.`,
    );
  }

  return url.toString();
}

export function parsePublishingEnvironmentName(
  value: string | undefined,
): PublishingEnvironmentName {
  if (value === "preview" || value === "production") {
    return value;
  }

  throw new PublishingConfigurationError(
    'Choose an environment with "--environment preview" or "--environment production".',
  );
}

export async function readPublishingEnvironment(
  name: PublishingEnvironmentName,
  directory = process.cwd(),
): Promise<PublishingEnvironment> {
  const fileName = `.env.publish.${name}`;
  let source: string;

  try {
    source = await readFile(resolve(directory, fileName), "utf8");
  } catch {
    throw new PublishingConfigurationError(
      `${fileName} is missing or could not be read.`,
    );
  }

  let values: ReturnType<typeof parseEnv>;

  try {
    values = parseEnv(source);
  } catch {
    throw new PublishingConfigurationError(
      `${fileName} contains invalid environment-file syntax.`,
    );
  }

  const supabaseUrl = requireHttpsUrl(
    requireValue(values, "SUPABASE_URL", fileName),
    "SUPABASE_URL",
    fileName,
  );
  const supabaseSecretKey = requireValue(
    values,
    "SUPABASE_SECRET_KEY",
    fileName,
  );

  if (!supabaseSecretKey.startsWith("sb_secret_")) {
    throw new PublishingConfigurationError(
      `SUPABASE_SECRET_KEY in ${fileName} must be a Supabase secret key beginning with sb_secret_.`,
    );
  }

  const deployHookValue = values.VERCEL_DEPLOY_HOOK_URL?.trim();
  const deployHookUrl = deployHookValue
    ? requireHttpsUrl(deployHookValue, "VERCEL_DEPLOY_HOOK_URL", fileName)
    : null;

  if (name === "production" && !deployHookUrl) {
    throw new PublishingConfigurationError(
      `${fileName} is missing VERCEL_DEPLOY_HOOK_URL.`,
    );
  }

  return {
    deployHookUrl,
    name,
    supabaseSecretKey,
    supabaseUrl,
  };
}

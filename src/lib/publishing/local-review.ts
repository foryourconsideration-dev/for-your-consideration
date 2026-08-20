import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

import type { PublishingPrompts } from "./prompts.ts";

export interface DatabaseBackedPreviewEnvironment {
  supabasePublishableKey: string;
  supabaseUrl: string;
}

export class LocalReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalReviewError";
  }
}

function astroCliPath() {
  return fileURLToPath(
    new URL("./bin/astro.mjs", import.meta.resolve("astro/package.json")),
  );
}

function buildPreviewSite(environment: DatabaseBackedPreviewEnvironment) {
  console.log("\nBuilding the database-backed Preview site...");
  const build = spawnSync(process.execPath, [astroCliPath(), "build"], {
    env: {
      ...process.env,
      SUPABASE_PUBLISHABLE_KEY: environment.supabasePublishableKey,
      SUPABASE_URL: environment.supabaseUrl,
    },
    stdio: "inherit",
  });

  if (build.error || build.status !== 0) {
    throw new LocalReviewError(
      "The Preview site could not be built. No Production change was made.",
    );
  }
}

function startPreviewServer() {
  const server = spawn(process.execPath, [astroCliPath(), "preview"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const ready = new Promise<string>((resolve, reject) => {
    let output = "";
    let siteUrl: string | undefined;
    const timeout = setTimeout(() => {
      reject(
        new LocalReviewError(
          "The local Preview server did not become ready. No Production change was made.",
        ),
      );
    }, 15_000);

    const inspect = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      const match = output.match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/);

      if (match?.[0]) {
        clearTimeout(timeout);
        siteUrl = `${match[0]}/`;
        resolve(siteUrl);
      }
    };

    server.stdout?.on("data", inspect);
    server.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    server.once("error", () => {
      clearTimeout(timeout);
      reject(
        new LocalReviewError(
          "The local Preview server could not be started. No Production change was made.",
        ),
      );
    });
    server.once("exit", () => {
      if (!siteUrl) {
        clearTimeout(timeout);
        reject(
          new LocalReviewError(
            "The local Preview server stopped before it was ready. No Production change was made.",
          ),
        );
      }
    });
  });

  return { ready, server };
}

function stopPreviewServer() {
  const stop = spawnSync(
    process.execPath,
    [astroCliPath(), "preview", "stop"],
    { stdio: "inherit" },
  );

  if (stop.error || stop.status !== 0) {
    throw new LocalReviewError(
      "The local Preview server could not be stopped automatically. Run `npx astro preview stop`.",
    );
  }
}

export async function reviewDatabaseBackedPreview(
  slug: string,
  prompts: PublishingPrompts,
  environment: DatabaseBackedPreviewEnvironment,
) {
  buildPreviewSite(environment);
  console.log("\nStarting the local Preview site...");
  const { ready } = startPreviewServer();

  try {
    const siteUrl = await ready;
    const articleUrl = new URL(`/articles/${slug}/`, siteUrl).toString();
    console.log("\nReview these pages before continuing:");
    console.log(`  Homepage: ${siteUrl}`);
    console.log(`  Article:  ${articleUrl}\n`);

    return await prompts.continueOrStop(
      "After reviewing the Preview-backed site,",
    );
  } finally {
    stopPreviewServer();
  }
}

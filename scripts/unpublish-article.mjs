import console from "node:console";
import process from "node:process";

import { parsePublishingArguments } from "../src/lib/publishing/arguments.ts";
import {
  createArticlePublishingRepository,
  planUnpublication,
} from "../src/lib/publishing/articles.ts";
import { createPublishingSupabaseClient } from "../src/lib/publishing/client.ts";
import { confirmProductionChange } from "../src/lib/publishing/confirmation.ts";
import { triggerDeployment } from "../src/lib/publishing/deployment.ts";
import { readPublishingEnvironment } from "../src/lib/publishing/environment.ts";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function environmentLabel(environment) {
  return environment === "production" ? "Production" : "Preview";
}

try {
  const options = parsePublishingArguments(
    process.argv.slice(2),
    "article slug",
  );

  if (!slugPattern.test(options.target)) {
    throw new Error(
      "The article slug must use lowercase letters and numbers separated by single hyphens.",
    );
  }

  const environment = await readPublishingEnvironment(options.environment);
  const repository = createArticlePublishingRepository(
    createPublishingSupabaseClient(
      environment.supabaseUrl,
      environment.supabaseSecretKey,
    ),
  );
  const change = planUnpublication(
    await repository.findBySlug(options.target),
    options.target,
  );
  const label = environmentLabel(environment.name);

  if (change === "unchanged") {
    console.log(
      `Article "${options.target}" is already archived in ${label}. No database change or deployment was requested.`,
    );
  } else if (!options.apply) {
    console.log(
      `Dry run: ${label} would archive article "${options.target}". No change was made.`,
    );
  } else {
    await confirmProductionChange(
      environment.name,
      "unpublish",
      options.target,
    );
    await repository.archive(options.target);

    if (environment.name === "production" && environment.deployHookUrl) {
      await triggerDeployment(environment.deployHookUrl);
      console.log(
        `Archived article "${options.target}" in ${label} and requested a Vercel deployment.`,
      );
    } else {
      console.log(`Archived article "${options.target}" in ${label}.`);
    }
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "The article could not be unpublished.",
  );

  if (error?.name === "DeploymentHookError") {
    console.error(
      "The database change is retained. Redeploy Production from the Vercel dashboard to recover.",
    );
  }

  process.exitCode = 1;
}

import console from "node:console";
import process from "node:process";

import { readAuthoringArticle } from "../src/lib/authoring/article-files.ts";
import { parsePublishingArguments } from "../src/lib/publishing/arguments.ts";
import {
  createArticlePublishingRepository,
  planPublication,
} from "../src/lib/publishing/articles.ts";
import { createPublishingSupabaseClient } from "../src/lib/publishing/client.ts";
import { confirmProductionChange } from "../src/lib/publishing/confirmation.ts";
import { triggerDeployment } from "../src/lib/publishing/deployment.ts";
import { readPublishingEnvironment } from "../src/lib/publishing/environment.ts";

function environmentLabel(environment) {
  return environment === "production" ? "Production" : "Preview";
}

try {
  const options = parsePublishingArguments(
    process.argv.slice(2),
    "Markdown article file",
  );
  const article = await readAuthoringArticle(options.target);
  const environment = await readPublishingEnvironment(options.environment);
  const repository = createArticlePublishingRepository(
    createPublishingSupabaseClient(
      environment.supabaseUrl,
      environment.supabaseSecretKey,
    ),
  );
  const current = await repository.findBySlug(article.slug);
  const change = planPublication(current, article);
  const label = environmentLabel(environment.name);

  if (change === "unchanged") {
    console.log(
      `Article "${article.slug}" already matches ${label}. No database change or deployment was requested.`,
    );
  } else if (!options.apply) {
    console.log(
      `Dry run: ${label} would ${change} article "${article.slug}". No change was made.`,
    );
  } else {
    await confirmProductionChange(environment.name, "publish", article.slug);
    await repository.upsertPublished(article);

    if (environment.name === "production" && environment.deployHookUrl) {
      await triggerDeployment(environment.deployHookUrl);
      console.log(
        `Published article "${article.slug}" to ${label} and requested a Vercel deployment.`,
      );
    } else {
      console.log(`Published article "${article.slug}" to ${label}.`);
    }
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "The article could not be published.",
  );

  if (error?.name === "DeploymentHookError") {
    console.error(
      "The database change is retained. Redeploy Production from the Vercel dashboard to recover.",
    );
  }

  process.exitCode = 1;
}

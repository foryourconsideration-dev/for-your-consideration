import console from "node:console";
import process from "node:process";

import { readAuthoringArticle } from "../src/lib/authoring/article-files.ts";
import { parseArticlePublicationArguments } from "../src/lib/publishing/arguments.ts";
import {
  createArticlePublishingRepository,
  planPublication,
} from "../src/lib/publishing/articles.ts";
import { createPublishingSupabaseClient } from "../src/lib/publishing/client.ts";
import { confirmProductionChange } from "../src/lib/publishing/confirmation.ts";
import { triggerDeployment } from "../src/lib/publishing/deployment.ts";
import {
  readLocalPreviewBuildEnvironment,
  readPublishingEnvironment,
} from "../src/lib/publishing/environment.ts";
import { runGuidedPublication } from "../src/lib/publishing/guided-workflow.ts";
import { reviewDatabaseBackedPreview } from "../src/lib/publishing/local-review.ts";
import {
  applyPublicationInstructions,
  previewReviewInstructions,
} from "../src/lib/publishing/messages.ts";
import { createPublishingPrompts } from "../src/lib/publishing/prompts.ts";

function environmentLabel(environment) {
  return environment === "production" ? "Production" : "Preview";
}

async function runTargetedPublication(article, options) {
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

    if (environment.name === "preview") {
      console.log(previewReviewInstructions(article.slug));
    }
  } else if (!options.apply) {
    console.log(
      `Dry run: ${label} would ${change} article "${article.slug}". No change was made.`,
    );
    console.log(applyPublicationInstructions());
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

      if (environment.name === "preview") {
        console.log(previewReviewInstructions(article.slug));
      }
    }
  }
}

async function runGuidedArticlePublication(article) {
  const prompts = createPublishingPrompts();
  const configurations = new Map();

  async function configuration(environment) {
    if (!configurations.has(environment)) {
      configurations.set(
        environment,
        await readPublishingEnvironment(environment),
      );
    }

    return configurations.get(environment);
  }

  await runGuidedPublication(article, {
    async createRepository(environment) {
      const values = await configuration(environment);
      return createArticlePublishingRepository(
        createPublishingSupabaseClient(
          values.supabaseUrl,
          values.supabaseSecretKey,
        ),
      );
    },
    async deployProduction() {
      const environment = await configuration("production");
      await triggerDeployment(environment.deployHookUrl);
    },
    prompts,
    async reviewPreview(slug) {
      const preview = await configuration("preview");
      const buildEnvironment = await readLocalPreviewBuildEnvironment(
        preview.supabaseUrl,
      );
      return reviewDatabaseBackedPreview(slug, prompts, buildEnvironment);
    },
    write(message) {
      console.log(message);
    },
  });
}

try {
  const options = parseArticlePublicationArguments(process.argv.slice(2));
  const article = await readAuthoringArticle(options.target);

  if (options.mode === "guided") {
    await runGuidedArticlePublication(article);
  } else {
    await runTargetedPublication(article, options);
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

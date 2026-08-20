import type { AuthoringArticle } from "../authoring/article-files.ts";
import {
  planPublication,
  type ArticlePublishingRepository,
  type PublicationChange,
} from "./articles.ts";
import type { PublishingEnvironmentName } from "./environment.ts";
import type { PublishingPrompts } from "./prompts.ts";

export type GuidedPublicationResult =
  | "published"
  | "stopped-before-preview"
  | "stopped-before-production"
  | "unchanged";

export interface GuidedPublicationDependencies {
  createRepository(
    environment: PublishingEnvironmentName,
  ): Promise<ArticlePublishingRepository>;
  deployProduction(): Promise<void>;
  prompts: PublishingPrompts;
  reviewPreview(slug: string): Promise<boolean>;
  write(message: string): void;
}

function describePlan(
  environment: "Preview" | "Production",
  change: PublicationChange,
  slug: string,
) {
  if (change === "unchanged") {
    return `${environment} already matches article "${slug}".`;
  }

  return `${environment} will ${change} article "${slug}".`;
}

export async function runGuidedPublication(
  article: AuthoringArticle,
  dependencies: GuidedPublicationDependencies,
): Promise<GuidedPublicationResult> {
  const previewRepository = await dependencies.createRepository("preview");
  const previewChange = planPublication(
    await previewRepository.findBySlug(article.slug),
    article,
  );
  dependencies.write(describePlan("Preview", previewChange, article.slug));

  if (
    previewChange !== "unchanged" &&
    !(await dependencies.prompts.continueOrStop(
      "Continue with the Preview upload?",
    ))
  ) {
    dependencies.write("Stopped before changing Preview.");
    return "stopped-before-preview";
  }

  if (previewChange !== "unchanged") {
    await previewRepository.upsertPublished(article);
    dependencies.write(`Uploaded article "${article.slug}" to Preview.`);
  }

  if (!(await dependencies.reviewPreview(article.slug))) {
    dependencies.write(
      "Stopped after Preview review. Production was unchanged.",
    );
    return "stopped-before-production";
  }

  const productionRepository =
    await dependencies.createRepository("production");
  const productionChange = planPublication(
    await productionRepository.findBySlug(article.slug),
    article,
  );
  dependencies.write(
    describePlan("Production", productionChange, article.slug),
  );

  if (productionChange === "unchanged") {
    dependencies.write(
      "Production already matches the reviewed article. No deployment was requested.",
    );
    return "unchanged";
  }

  if (!(await dependencies.prompts.publishOrStop(article.slug))) {
    dependencies.write("Stopped before changing Production.");
    return "stopped-before-production";
  }

  await productionRepository.upsertPublished(article);
  await dependencies.deployProduction();
  dependencies.write(
    `Published article "${article.slug}" to Production and requested a Vercel deployment.`,
  );
  return "published";
}

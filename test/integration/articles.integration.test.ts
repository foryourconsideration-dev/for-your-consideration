import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { ARTICLE_IMAGE_BUCKET } from "../../src/lib/article-images.ts";
import { readAuthoringArticle } from "../../src/lib/authoring/article-files.ts";
import {
  createArticleRepository,
  type PublishedArticleSummary,
} from "../../src/data/articles.ts";
import {
  createArticlePublishingRepository,
  planPublication,
  planUnpublication,
} from "../../src/lib/publishing/articles.ts";
import { createPublishingSupabaseClient } from "../../src/lib/publishing/client.ts";
import { createServerSupabaseClient } from "../../src/lib/supabase/server.ts";

interface LocalSupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}

function localSupabaseStatus(): LocalSupabaseStatus {
  const output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });

  return JSON.parse(output) as LocalSupabaseStatus;
}

const status = localSupabaseStatus();
const readerClient = createServerSupabaseClient({
  SUPABASE_URL: status.API_URL,
  SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
});
const repository = createArticleRepository(readerClient);
const publishingClient = createPublishingSupabaseClient(
  status.API_URL,
  status.SECRET_KEY,
);
const publishingRepository =
  createArticlePublishingRepository(publishingClient);
const imageFixture = await readAuthoringArticle(
  "test/fixtures/authoring/fixture-article.md",
);
const publishingSlug = `publishing-integration-${randomUUID()}`;
const fixtureImage = imageFixture.images[0]!;
const imageFileName = fixtureImage.path.split("/").at(-1);
const publishingArticle = {
  ...imageFixture,
  bodyMarkdown: "Publishing integration fixture.",
  images: [
    {
      ...fixtureImage,
      path: `${publishingSlug}/${imageFileName}`,
    },
  ],
  publishedAt: "2026-08-19T12:00:00Z",
  slug: publishingSlug,
  subtitle: null,
  title: "Publishing integration fixture",
};

describe("article repository with local Supabase", () => {
  it("lists only published seed articles newest first", async () => {
    const articles = await repository.listPublishedArticles();

    assert.deepEqual(
      articles.map(({ slug }: PublishedArticleSummary) => slug),
      [
        "published-article-one",
        "published-article-two",
        "published-article-three",
      ],
    );
  });

  it("retrieves a published article by slug", async () => {
    const article = await repository.getPublishedArticleBySlug(
      "published-article-one",
    );

    assert.equal(article?.title, "Published article one");
    assert.match(article?.bodyMarkdown ?? "", /Section heading/);
  });

  it("cannot retrieve draft or archived slugs", async () => {
    const [draft, archived] = await Promise.all([
      repository.getPublishedArticleBySlug("draft-article"),
      repository.getPublishedArticleBySlug("archived-article"),
    ]);

    assert.equal(draft, null);
    assert.equal(archived, null);
  });
});

describe("article publishing with local Supabase", () => {
  const article = publishingArticle;

  it("creates, updates, reruns, and archives one article safely", async () => {
    assert.equal(
      planPublication(
        await publishingRepository.findBySlug(article.slug),
        article,
        new Date("2026-08-20T12:00:00Z"),
      ),
      "create",
    );

    await publishingRepository.upsertPublished(article);
    const created = await publishingRepository.findBySlug(article.slug);

    assert.equal(created?.status, "published");
    const createdImage = created?.images.find(
      ({ reference }) => reference === article.leadImageReference,
    );
    assert.equal(created?.lead_image_id, createdImage?.id);
    assert.equal(createdImage?.storage_path, article.images[0]?.path);

    const { data: publicImage, error: publicImageError } =
      await readerClient.storage
        .from(ARTICLE_IMAGE_BUCKET)
        .download(article.images[0]!.path);

    assert.equal(publicImageError, null);
    assert.equal(
      publicImage?.size,
      (await readFile(article.images[0]!.filePath)).byteLength,
    );

    const { error: unauthorizedUploadError } = await readerClient.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .upload(`unauthorized-${randomUUID()}.png`, new Uint8Array([1]), {
        contentType: "image/png",
      });

    assert.ok(unauthorizedUploadError);
    assert.equal(
      planPublication(created, article, new Date("2026-08-20T12:00:00Z")),
      "unchanged",
    );

    const updatedArticle = { ...article, title: "Updated fixture title" };
    assert.equal(
      planPublication(
        created,
        updatedArticle,
        new Date("2026-08-20T12:00:00Z"),
      ),
      "update",
    );
    await publishingRepository.upsertPublished(updatedArticle);

    assert.equal(
      planUnpublication(
        await publishingRepository.findBySlug(article.slug),
        article.slug,
      ),
      "archive",
    );
    await publishingRepository.archive(article.slug);

    assert.equal(
      (await publishingRepository.findBySlug(article.slug))?.status,
      "archived",
    );
    assert.equal(
      await repository.getPublishedArticleBySlug(article.slug),
      null,
    );
  });
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

import {
  createArticleRepository,
  type PublishedArticleSummary,
} from "../../src/data/articles.ts";
import { createServerSupabaseClient } from "../../src/lib/supabase/server.ts";

interface LocalSupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
}

function localSupabaseStatus(): LocalSupabaseStatus {
  const output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });

  return JSON.parse(output) as LocalSupabaseStatus;
}

const status = localSupabaseStatus();
const repository = createArticleRepository(
  createServerSupabaseClient({
    SUPABASE_URL: status.API_URL,
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  }),
);

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

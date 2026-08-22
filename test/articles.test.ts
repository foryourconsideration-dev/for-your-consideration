import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ArticleDataError,
  createArticleRepository,
} from "../src/data/articles.ts";
import type { Database } from "../src/types/database.ts";

type QueryResult = {
  data: unknown;
  error: unknown;
};

type Call = {
  method: string;
  arguments: unknown[];
};

class QueryDouble implements PromiseLike<QueryResult> {
  readonly calls: Call[] = [];
  private readonly result: QueryResult;

  constructor(result: QueryResult) {
    this.result = result;
  }

  select(...arguments_: unknown[]) {
    return this.record("select", arguments_);
  }

  eq(...arguments_: unknown[]) {
    return this.record("eq", arguments_);
  }

  lte(...arguments_: unknown[]) {
    return this.record("lte", arguments_);
  }

  order(...arguments_: unknown[]) {
    return this.record("order", arguments_);
  }

  maybeSingle(...arguments_: unknown[]) {
    this.record("maybeSingle", arguments_);
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  private record(method: string, arguments_: unknown[]) {
    this.calls.push({ method, arguments: arguments_ });
    return this;
  }
}

function clientWith(result: QueryResult, imageResult?: QueryResult) {
  const query = new QueryDouble(result);
  const imageQuery = new QueryDouble(
    imageResult ?? { data: null, error: null },
  );
  const tables: string[] = [];
  const storageBuckets: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      return table === "article_images" ? imageQuery : query;
    },
    storage: {
      from(bucket: string) {
        storageBuckets.push(bucket);
        return {
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`,
              },
            };
          },
        };
      },
    },
  } as unknown as SupabaseClient<Database>;

  return { client, imageQuery, query, storageBuckets, tables };
}

const now = () => new Date("2026-08-18T12:00:00.000Z");

describe("article repository", () => {
  it("lists mapped published article summaries newest first", async () => {
    const { client, query, tables } = clientWith({
      data: [
        {
          id: "article-2",
          slug: "newer-article",
          title: "Newer article",
          subtitle: null,
          published_at: "2026-08-17T12:00:00.000Z",
        },
        {
          id: "article-1",
          slug: "older-article",
          title: "Older article",
          subtitle: "Article subtitle",
          published_at: "2026-08-16T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const articles = await createArticleRepository(client, {
      now,
    }).listPublishedArticles();

    assert.deepEqual(articles, [
      {
        id: "article-2",
        slug: "newer-article",
        title: "Newer article",
        subtitle: null,
        publishedAt: "2026-08-17T12:00:00.000Z",
      },
      {
        id: "article-1",
        slug: "older-article",
        title: "Older article",
        subtitle: "Article subtitle",
        publishedAt: "2026-08-16T12:00:00.000Z",
      },
    ]);
    assert.deepEqual(tables, ["articles"]);
    assert.deepEqual(query.calls, [
      {
        method: "select",
        arguments: ["id, slug, title, subtitle, published_at"],
      },
      { method: "eq", arguments: ["status", "published"] },
      {
        method: "lte",
        arguments: ["published_at", "2026-08-18T12:00:00.000Z"],
      },
      {
        method: "order",
        arguments: ["published_at", { ascending: false }],
      },
    ]);
  });

  it("returns an empty list when there are no published articles", async () => {
    const { client } = clientWith({ data: [], error: null });

    assert.deepEqual(
      await createArticleRepository(client, { now }).listPublishedArticles(),
      [],
    );
  });

  it("retrieves and maps one published article by slug", async () => {
    const { client, imageQuery, query, storageBuckets, tables } = clientWith(
      {
        data: {
          id: "article-1",
          lead_image_id: "image-1",
          slug: "article-slug",
          title: "Article title",
          subtitle: null,
          body_markdown: "Body paragraph.",
          published_at: "2026-08-17T12:00:00.000Z",
        },
        error: null,
      },
      {
        data: {
          alt: "A quiet landscape.",
          caption: "A fictional caption.",
          credit: "Fixture photographer",
          height: 675,
          storage_path: "article-slug/abc123.png",
          width: 1200,
        },
        error: null,
      },
    );

    const article = await createArticleRepository(client, {
      now,
    }).getPublishedArticleBySlug("article-slug");

    assert.deepEqual(article, {
      id: "article-1",
      leadImage: {
        alt: "A quiet landscape.",
        caption: "A fictional caption.",
        credit: "Fixture photographer",
        height: 675,
        src: "https://example.supabase.co/storage/v1/object/public/article-images/article-slug/abc123.png",
        width: 1200,
      },
      slug: "article-slug",
      title: "Article title",
      subtitle: null,
      bodyMarkdown: "Body paragraph.",
      publishedAt: "2026-08-17T12:00:00.000Z",
    });
    assert.deepEqual(tables, ["articles", "article_images"]);
    assert.deepEqual(storageBuckets, ["article-images"]);
    assert.deepEqual(query.calls[0], {
      method: "select",
      arguments: [
        "id, slug, title, subtitle, body_markdown, published_at, lead_image_id",
      ],
    });
    assert.deepEqual(query.calls.slice(1), [
      { method: "eq", arguments: ["status", "published"] },
      {
        method: "lte",
        arguments: ["published_at", "2026-08-18T12:00:00.000Z"],
      },
      { method: "eq", arguments: ["slug", "article-slug"] },
      { method: "maybeSingle", arguments: [] },
    ]);
    assert.deepEqual(imageQuery.calls, [
      {
        method: "select",
        arguments: ["storage_path, alt, caption, credit, width, height"],
      },
      { method: "eq", arguments: ["id", "image-1"] },
      { method: "eq", arguments: ["article_id", "article-1"] },
      { method: "maybeSingle", arguments: [] },
    ]);
  });

  it("omits lead-image resolution when the article has no lead image", async () => {
    const { client, imageQuery, tables } = clientWith({
      data: {
        id: "article-1",
        lead_image_id: null,
        slug: "article-slug",
        title: "Article title",
        subtitle: null,
        body_markdown: "Body paragraph.",
        published_at: "2026-08-17T12:00:00.000Z",
      },
      error: null,
    });

    const article = await createArticleRepository(client, {
      now,
    }).getPublishedArticleBySlug("article-slug");

    assert.equal(article?.leadImage, null);
    assert.deepEqual(tables, ["articles"]);
    assert.deepEqual(imageQuery.calls, []);
  });

  it("rejects an unavailable lead-image relationship", async () => {
    const { client } = clientWith(
      {
        data: {
          id: "article-1",
          lead_image_id: "image-1",
          slug: "article-slug",
          title: "Article title",
          subtitle: null,
          body_markdown: "Body paragraph.",
          published_at: "2026-08-17T12:00:00.000Z",
        },
        error: null,
      },
      { data: null, error: null },
    );

    await assert.rejects(
      createArticleRepository(client, { now }).getPublishedArticleBySlug(
        "article-slug",
      ),
      /lead image: its metadata is unavailable/,
    );
  });

  it("returns null when a published slug is not found", async () => {
    const { client } = clientWith({ data: null, error: null });

    assert.equal(
      await createArticleRepository(client, {
        now,
      }).getPublishedArticleBySlug("missing-article"),
      null,
    );
  });

  it("distinguishes list failures from an empty publication", async () => {
    const databaseError = {
      code: "08006",
      details: "",
      hint: "",
      message: "connection failed",
    };
    const { client } = clientWith({ data: null, error: databaseError });

    await assert.rejects(
      createArticleRepository(client, { now }).listPublishedArticles(),
      (error: unknown) => {
        assert.ok(error instanceof ArticleDataError);
        assert.equal(error.message, "Unable to list published articles.");
        assert.equal(error.cause, databaseError);
        return true;
      },
    );
  });

  it("distinguishes lookup failures from a missing slug", async () => {
    const databaseError = {
      code: "08006",
      details: "",
      hint: "",
      message: "connection failed",
    };
    const { client } = clientWith({ data: null, error: databaseError });

    await assert.rejects(
      createArticleRepository(client, { now }).getPublishedArticleBySlug(
        "article-slug",
      ),
      (error: unknown) => {
        assert.ok(error instanceof ArticleDataError);
        assert.equal(
          error.message,
          "Unable to retrieve the published article.",
        );
        assert.equal(error.cause, databaseError);
        return true;
      },
    );
  });
});

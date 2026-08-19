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

function clientWith(result: QueryResult) {
  const query = new QueryDouble(result);
  const tables: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      return query;
    },
  } as unknown as SupabaseClient<Database>;

  return { client, query, tables };
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
    const { client, query } = clientWith({
      data: {
        id: "article-1",
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

    assert.deepEqual(article, {
      id: "article-1",
      slug: "article-slug",
      title: "Article title",
      subtitle: null,
      bodyMarkdown: "Body paragraph.",
      publishedAt: "2026-08-17T12:00:00.000Z",
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

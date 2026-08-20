import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthoringArticle } from "../authoring/article-files.ts";
import type { Database } from "../../types/database.ts";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

export type PublicationChange = "create" | "update" | "unchanged";
export type UnpublicationChange = "archive" | "unchanged";

export interface ArticlePublishingRepository {
  archive(slug: string): Promise<void>;
  findBySlug(slug: string): Promise<ArticleRow | null>;
  upsertPublished(article: AuthoringArticle): Promise<void>;
}

export class ArticlePublishingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArticlePublishingError";
  }
}

function databaseError(operation: string) {
  return new ArticlePublishingError(
    `Supabase could not ${operation}. No credentials or article contents were printed.`,
  );
}

function canonicalTimestamp(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

function articlesMatch(current: ArticleRow, article: AuthoringArticle) {
  return (
    current.status === "published" &&
    current.title === article.title &&
    current.subtitle === article.subtitle &&
    current.body_markdown === article.bodyMarkdown &&
    canonicalTimestamp(current.published_at) ===
      canonicalTimestamp(article.publishedAt)
  );
}

export function planPublication(
  current: ArticleRow | null,
  article: AuthoringArticle,
  now = new Date(),
): PublicationChange {
  if (new Date(article.publishedAt).getTime() > now.getTime()) {
    throw new ArticlePublishingError(
      `Article "${article.slug}" cannot be published before its publishedAt timestamp.`,
    );
  }

  if (!current) {
    return "create";
  }

  return articlesMatch(current, article) ? "unchanged" : "update";
}

export function planUnpublication(
  current: ArticleRow | null,
  slug: string,
): UnpublicationChange {
  if (!current) {
    throw new ArticlePublishingError(`Article "${slug}" does not exist.`);
  }

  if (current.status === "draft") {
    throw new ArticlePublishingError(
      `Article "${slug}" is a draft and cannot be archived as a published article.`,
    );
  }

  return current.status === "archived" ? "unchanged" : "archive";
}

export function createArticlePublishingRepository(
  client: SupabaseClient<Database>,
): ArticlePublishingRepository {
  return {
    async archive(slug) {
      const { error } = await client
        .from("articles")
        .update({ status: "archived" })
        .eq("slug", slug);

      if (error) {
        throw databaseError(`archive article "${slug}"`);
      }
    },

    async findBySlug(slug) {
      const { data, error } = await client
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw databaseError(`read article "${slug}"`);
      }

      return data;
    },

    async upsertPublished(article) {
      const { error } = await client.from("articles").upsert(
        {
          body_markdown: article.bodyMarkdown,
          published_at: article.publishedAt,
          slug: article.slug,
          status: "published",
          subtitle: article.subtitle,
          title: article.title,
        },
        { onConflict: "slug" },
      );

      if (error) {
        throw databaseError(`publish article "${article.slug}"`);
      }
    },
  };
}

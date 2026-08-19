import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { getServerSupabaseClient } from "../lib/supabase/server.ts";
import type { Database, Tables } from "../types/database.ts";

const ARTICLE_SUMMARY_COLUMNS =
  "id, slug, title, subtitle, published_at" as const;
const ARTICLE_COLUMNS =
  "id, slug, title, subtitle, body_markdown, published_at" as const;

type ArticleRow = Tables<"articles">;
type ArticleSummaryRow = Pick<
  ArticleRow,
  "id" | "slug" | "title" | "subtitle" | "published_at"
>;
type PublishedArticleRow = Pick<
  ArticleRow,
  "id" | "slug" | "title" | "subtitle" | "body_markdown" | "published_at"
>;

export interface PublishedArticleSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: string;
}

export interface PublishedArticle extends PublishedArticleSummary {
  bodyMarkdown: string;
}

export class ArticleDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArticleDataError";
  }
}

interface ArticleRepositoryOptions {
  now?: () => Date;
}

function publicationDate(
  row: ArticleSummaryRow,
  operation: "list" | "retrieve",
): string {
  if (!row.published_at) {
    throw new ArticleDataError(
      `Unable to ${operation} published articles: a result has no publication date.`,
    );
  }

  return row.published_at;
}

function mapSummary(
  row: ArticleSummaryRow,
  operation: "list" | "retrieve" = "list",
): PublishedArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    publishedAt: publicationDate(row, operation),
  };
}

function mapArticle(row: PublishedArticleRow): PublishedArticle {
  return {
    ...mapSummary(row, "retrieve"),
    bodyMarkdown: row.body_markdown,
  };
}

function queryError(message: string, error: PostgrestError): ArticleDataError {
  return new ArticleDataError(message, { cause: error });
}

export function createArticleRepository(
  supabase: SupabaseClient<Database>,
  { now = () => new Date() }: ArticleRepositoryOptions = {},
) {
  return {
    async listPublishedArticles(): Promise<PublishedArticleSummary[]> {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_SUMMARY_COLUMNS)
        .eq("status", "published")
        .lte("published_at", now().toISOString())
        .order("published_at", { ascending: false });

      if (error) {
        throw queryError("Unable to list published articles.", error);
      }

      return (data ?? []).map((row) => mapSummary(row));
    },

    async getPublishedArticleBySlug(
      slug: string,
    ): Promise<PublishedArticle | null> {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .eq("status", "published")
        .lte("published_at", now().toISOString())
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw queryError("Unable to retrieve the published article.", error);
      }

      return data ? mapArticle(data) : null;
    },
  };
}

function repository() {
  return createArticleRepository(getServerSupabaseClient());
}

export function listPublishedArticles() {
  return repository().listPublishedArticles();
}

export function getPublishedArticleBySlug(slug: string) {
  return repository().getPublishedArticleBySlug(slug);
}

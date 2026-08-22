import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { ARTICLE_IMAGE_BUCKET } from "../lib/article-images.ts";
import { getServerSupabaseClient } from "../lib/supabase/server.ts";
import type { Database, Tables } from "../types/database.ts";

const ARTICLE_SUMMARY_COLUMNS =
  "id, slug, title, subtitle, published_at" as const;
const ARTICLE_COLUMNS =
  "id, slug, title, subtitle, body_markdown, published_at, lead_image_id" as const;
const ARTICLE_IMAGE_COLUMNS =
  "storage_path, alt, caption, credit, width, height" as const;

type ArticleRow = Tables<"articles">;
type ArticleSummaryRow = Pick<
  ArticleRow,
  "id" | "slug" | "title" | "subtitle" | "published_at"
>;
type PublishedArticleRow = Pick<
  ArticleRow,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "body_markdown"
  | "published_at"
  | "lead_image_id"
>;
type ArticleImageRow = Pick<
  Tables<"article_images">,
  "storage_path" | "alt" | "caption" | "credit" | "width" | "height"
>;

export interface PublishedLeadImage {
  alt: string;
  caption: string | null;
  credit: string | null;
  height: number;
  src: string;
  width: number;
}

export interface PublishedArticleSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: string;
}

export interface PublishedArticle extends PublishedArticleSummary {
  bodyMarkdown: string;
  leadImage: PublishedLeadImage | null;
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

function mapArticle(
  row: PublishedArticleRow,
  leadImage: PublishedLeadImage | null,
): PublishedArticle {
  return {
    ...mapSummary(row, "retrieve"),
    bodyMarkdown: row.body_markdown,
    leadImage,
  };
}

async function retrieveLeadImage(
  article: PublishedArticleRow,
  supabase: SupabaseClient<Database>,
): Promise<PublishedLeadImage | null> {
  if (!article.lead_image_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("article_images")
    .select(ARTICLE_IMAGE_COLUMNS)
    .eq("id", article.lead_image_id)
    .eq("article_id", article.id)
    .maybeSingle();

  if (error) {
    throw queryError(
      "Unable to retrieve the published article lead image.",
      error,
    );
  }

  if (!data) {
    throw new ArticleDataError(
      "Unable to retrieve the published article lead image: its metadata is unavailable.",
    );
  }

  const image = data as ArticleImageRow;
  const { publicUrl } = supabase.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .getPublicUrl(image.storage_path).data;

  return {
    alt: image.alt,
    caption: image.caption,
    credit: image.credit,
    height: image.height,
    src: publicUrl,
    width: image.width,
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

      if (!data) {
        return null;
      }

      return mapArticle(data, await retrieveLeadImage(data, supabase));
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

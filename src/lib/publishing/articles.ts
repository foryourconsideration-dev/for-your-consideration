import { readFile } from "node:fs/promises";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ARTICLE_IMAGE_BUCKET } from "../article-images.ts";
import type { AuthoringArticle } from "../authoring/article-files.ts";
import type { Database } from "../../types/database.ts";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type ArticleImageRow = Database["public"]["Tables"]["article_images"]["Row"];

export interface ArticlePublishingRecord extends ArticleRow {
  images: ArticleImageRow[];
}

export type PublicationChange = "create" | "update" | "unchanged";
export type UnpublicationChange = "archive" | "unchanged";

export interface ArticlePublishingRepository {
  archive(slug: string): Promise<void>;
  findBySlug(slug: string): Promise<ArticlePublishingRecord | null>;
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

function articlesMatch(
  current: ArticlePublishingRecord,
  article: AuthoringArticle,
) {
  const imagesMatch = article.images.every((image) => {
    const currentImage = current.images.find(
      ({ reference }) => reference === image.reference,
    );

    return (
      currentImage?.storage_path === image.path &&
      currentImage.alt === image.alt &&
      currentImage.caption === image.caption &&
      currentImage.credit === image.credit &&
      currentImage.width === image.width &&
      currentImage.height === image.height
    );
  });
  const leadImage = article.leadImageReference
    ? current.images.find(
        ({ reference }) => reference === article.leadImageReference,
      )
    : null;

  return (
    current.status === "published" &&
    current.title === article.title &&
    current.subtitle === article.subtitle &&
    current.body_markdown === article.bodyMarkdown &&
    imagesMatch &&
    current.lead_image_id === (leadImage?.id ?? null) &&
    canonicalTimestamp(current.published_at) ===
      canonicalTimestamp(article.publishedAt)
  );
}

export function planPublication(
  current: ArticlePublishingRecord | null,
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

      if (!data) {
        return null;
      }

      const { data: images, error: imagesError } = await client
        .from("article_images")
        .select("*")
        .eq("article_id", data.id);

      if (imagesError) {
        throw databaseError(`read images for article "${slug}"`);
      }

      return { ...data, images };
    },

    async upsertPublished(article) {
      let current = await this.findBySlug(article.slug);

      if (!current) {
        const { data, error } = await client
          .from("articles")
          .insert({
            body_markdown: article.bodyMarkdown,
            published_at: null,
            slug: article.slug,
            status: "draft",
            subtitle: article.subtitle,
            title: article.title,
          })
          .select("*")
          .single();

        if (error) {
          throw databaseError(`create draft article "${article.slug}"`);
        }

        current = { ...data, images: [] };
      }

      const imageIds = new Map<string, string>();

      for (const image of article.images) {
        let bytes: Buffer;

        try {
          bytes = await readFile(image.filePath);
        } catch {
          throw new ArticlePublishingError(
            `Image "${image.reference}" for article "${article.slug}" could not be read. No private path was printed.`,
          );
        }

        const { error: imageError } = await client.storage
          .from(ARTICLE_IMAGE_BUCKET)
          .upload(image.path, bytes, {
            cacheControl: "31536000",
            contentType: image.contentType,
            upsert: true,
          });

        if (imageError) {
          throw databaseError(
            `upload image "${image.reference}" for article "${article.slug}"`,
          );
        }

        const { data: imageRow, error: metadataError } = await client
          .from("article_images")
          .upsert(
            {
              alt: image.alt,
              article_id: current.id,
              caption: image.caption,
              credit: image.credit,
              height: image.height,
              reference: image.reference,
              storage_path: image.path,
              width: image.width,
            },
            { onConflict: "article_id,reference" },
          )
          .select("id")
          .single();

        if (metadataError) {
          throw databaseError(
            `write metadata for image "${image.reference}" in article "${article.slug}"`,
          );
        }

        imageIds.set(image.reference, imageRow.id);
      }

      const leadImageId = article.leadImageReference
        ? imageIds.get(article.leadImageReference)
        : null;

      if (article.leadImageReference && !leadImageId) {
        throw new ArticlePublishingError(
          `Lead image "${article.leadImageReference}" was not resolved for article "${article.slug}".`,
        );
      }

      const { error } = await client
        .from("articles")
        .update({
          body_markdown: article.bodyMarkdown,
          lead_image_id: leadImageId,
          published_at: article.publishedAt,
          status: "published",
          subtitle: article.subtitle,
          title: article.title,
        })
        .eq("id", current.id);

      if (error) {
        throw databaseError(`publish article "${article.slug}"`);
      }
    },
  };
}

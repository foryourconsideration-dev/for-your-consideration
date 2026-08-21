import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";

import { parseFrontmatter } from "@astrojs/markdown-remark";
import sharp from "sharp";
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maximumImageBytes = 5 * 1024 * 1024;

const publicationTimestamp = z.iso.datetime({ offset: true });

const trimmedString = (maximumLength: number) =>
  z
    .string()
    .min(1, "must not be empty")
    .max(maximumLength, `must contain at most ${maximumLength} characters`)
    .refine((value) => value === value.trim(), {
      message: "must not begin or end with whitespace",
    });

const articleFrontmatterSchema = z
  .object({
    images: z
      .array(
        z
          .object({
            alt: trimmedString(500),
            caption: trimmedString(500).optional(),
            credit: trimmedString(300).optional(),
            ref: trimmedString(120).regex(
              slugPattern,
              "must use lowercase letters and numbers separated by single hyphens",
            ),
            source: trimmedString(500),
          })
          .strict(),
      )
      .optional(),
    lead_image: trimmedString(120)
      .regex(
        slugPattern,
        "must use lowercase letters and numbers separated by single hyphens",
      )
      .optional(),
    publishedAt: publicationTimestamp,
    slug: trimmedString(120).regex(
      slugPattern,
      "must use lowercase letters and numbers separated by single hyphens",
    ),
    subtitle: trimmedString(300).optional(),
    title: trimmedString(200),
  })
  .strict();

export interface AuthoringImage {
  alt: string;
  caption: string | null;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  credit: string | null;
  filePath: string;
  height: number;
  path: string;
  reference: string;
  width: number;
}

export interface AuthoringArticle {
  bodyMarkdown: string;
  images: AuthoringImage[];
  leadImageReference: string | null;
  publishedAt: string;
  slug: string;
  subtitle: string | null;
  title: string;
}

interface ParsedAuthoringArticle extends Omit<AuthoringArticle, "images"> {
  images: Array<{
    alt: string;
    caption: string | null;
    credit: string | null;
    reference: string;
    source: string;
  }>;
}

export class ArticleFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArticleFileError";
  }
}

function validationMessage(sourceName: string, issues: string[]) {
  return `${sourceName}: ${issues.join("; ")}`;
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const field = issue.path.join(".") || "frontmatter";
    return `${field}: ${issue.message}`;
  });
}

export function parseAuthoringArticle(
  source: string,
  sourceName = "article.md",
): ParsedAuthoringArticle {
  if (!/^\uFEFF?---\r?\n/.test(source)) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        "frontmatter: expected YAML frontmatter delimited by ---",
      ]),
    );
  }

  let parsed: ReturnType<typeof parseFrontmatter>;

  try {
    parsed = parseFrontmatter(source);
  } catch {
    throw new ArticleFileError(
      validationMessage(sourceName, ["frontmatter: contains invalid YAML"]),
    );
  }

  const frontmatter = articleFrontmatterSchema.safeParse(parsed.frontmatter);

  if (!frontmatter.success) {
    throw new ArticleFileError(
      validationMessage(sourceName, formatZodIssues(frontmatter.error)),
    );
  }

  const bodyMarkdown = parsed.content.trim();

  if (!bodyMarkdown) {
    throw new ArticleFileError(
      validationMessage(sourceName, ["body: must not be empty"]),
    );
  }

  const images = (frontmatter.data.images ?? []).map((image) => ({
    alt: image.alt,
    caption: image.caption ?? null,
    credit: image.credit ?? null,
    reference: image.ref,
    source: image.source,
  }));
  const references = new Set(images.map(({ reference }) => reference));

  if (references.size !== images.length) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        "images: each image ref must be unique within the article",
      ]),
    );
  }

  if (
    frontmatter.data.lead_image &&
    !references.has(frontmatter.data.lead_image)
  ) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        "lead_image: must match an image ref defined in images",
      ]),
    );
  }

  return {
    bodyMarkdown,
    images,
    leadImageReference: frontmatter.data.lead_image ?? null,
    publishedAt: frontmatter.data.publishedAt,
    slug: frontmatter.data.slug,
    subtitle: frontmatter.data.subtitle ?? null,
    title: frontmatter.data.title,
  };
}

async function loadImage(
  article: ParsedAuthoringArticle,
  image: ParsedAuthoringArticle["images"][number],
  articleFilePath: string,
  sourceName: string,
): Promise<AuthoringImage> {
  const articleDirectory = dirname(articleFilePath);
  const imageSource = image.source;

  if (isAbsolute(imageSource)) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: must be relative to the article file`,
      ]),
    );
  }

  const filePath = resolve(articleDirectory, imageSource);
  const relativePath = relative(articleDirectory, filePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: must remain inside the article directory`,
      ]),
    );
  }

  let bytes: Buffer;

  try {
    bytes = await readFile(filePath);
  } catch {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: image file could not be read`,
      ]),
    );
  }

  if (bytes.byteLength > maximumImageBytes) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: image must not exceed 5 MiB`,
      ]),
    );
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

  try {
    metadata = await sharp(bytes, { animated: true }).metadata();
  } catch {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: image must be a valid JPEG, PNG, or WebP file`,
      ]),
    );
  }

  const formats = {
    jpeg: { contentType: "image/jpeg", extension: "jpg" },
    png: { contentType: "image/png", extension: "png" },
    webp: { contentType: "image/webp", extension: "webp" },
  } as const;
  const format = metadata.format
    ? formats[metadata.format as keyof typeof formats]
    : undefined;

  if (!format || !metadata.width || !metadata.height) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: image must be a valid JPEG, PNG, or WebP file`,
      ]),
    );
  }

  if ((metadata.pages ?? 1) > 1) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: animated images are not supported`,
      ]),
    );
  }

  if (metadata.width > 20_000 || metadata.height > 20_000) {
    throw new ArticleFileError(
      validationMessage(sourceName, [
        `images.${image.reference}.source: image dimensions must not exceed 20000 pixels`,
      ]),
    );
  }

  const digest = createHash("sha256").update(bytes).digest("hex");

  return {
    alt: image.alt,
    caption: image.caption,
    contentType: format.contentType,
    credit: image.credit,
    filePath,
    height: metadata.height,
    path: `${article.slug}/${digest}.${format.extension}`,
    reference: image.reference,
    width: metadata.width,
  };
}

export async function readAuthoringArticle(filePath: string) {
  if (extname(filePath).toLowerCase() !== ".md") {
    throw new ArticleFileError("Article files must use the .md extension.");
  }

  let source: string;

  try {
    source = await readFile(filePath, "utf8");
  } catch {
    throw new ArticleFileError("The article file could not be read.");
  }

  const sourceName = basename(filePath);
  const article = parseAuthoringArticle(source, sourceName);

  return {
    ...article,
    images: await Promise.all(
      article.images.map((image) =>
        loadImage(article, image, filePath, sourceName),
      ),
    ),
  };
}

export async function readAuthoringDirectory(directoryPath: string) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    throw new ArticleFileError(
      "The authoring directory is missing or could not be read.",
    );
  }

  const articleFiles = entries
    .filter(
      (entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".md",
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  const articles = await Promise.all(
    articleFiles.map((entry) =>
      readAuthoringArticle(join(directoryPath, entry.name)),
    ),
  );
  const slugs = new Set<string>();

  for (const article of articles) {
    if (slugs.has(article.slug)) {
      throw new ArticleFileError(
        `Duplicate article slug: ${article.slug}. Each local article must have a unique slug.`,
      );
    }

    slugs.add(article.slug);
  }

  return articles;
}

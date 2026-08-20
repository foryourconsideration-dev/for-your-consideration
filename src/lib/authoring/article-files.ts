import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { parseFrontmatter } from "@astrojs/markdown-remark";
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    publishedAt: publicationTimestamp,
    slug: trimmedString(120).regex(
      slugPattern,
      "must use lowercase letters and numbers separated by single hyphens",
    ),
    subtitle: trimmedString(300).optional(),
    title: trimmedString(200),
  })
  .strict();

export interface AuthoringArticle {
  bodyMarkdown: string;
  publishedAt: string;
  slug: string;
  subtitle: string | null;
  title: string;
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
): AuthoringArticle {
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

  return {
    bodyMarkdown,
    publishedAt: frontmatter.data.publishedAt,
    slug: frontmatter.data.slug,
    subtitle: frontmatter.data.subtitle ?? null,
    title: frontmatter.data.title,
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

  return parseAuthoringArticle(source, basename(filePath));
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

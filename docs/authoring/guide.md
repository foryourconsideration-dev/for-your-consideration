# Local article authoring

Private article source lives in `authoring/articles/` on the author's computer.
The directory is Git-ignored and ordinary builds do not read it. Do not place
private writing in test fixtures, screenshots, terminal output, or any other
tracked path.

## Create an article

Create the private directory if it does not exist:

```sh
mkdir -p authoring/articles
```

Add one Markdown file per article. The filename is for local organization; the
frontmatter `slug` controls the eventual article URL.

```md
---
slug: example-article
title: Example article
subtitle: An optional subtitle
publishedAt: "2026-08-20T09:00:00-07:00"
---

The article body starts here.
```

The YAML frontmatter accepts exactly these fields:

| Field         | Required | Rules                                                   |
| ------------- | -------- | ------------------------------------------------------- |
| `slug`        | Yes      | 1–120 lowercase letters or numbers separated by hyphens |
| `title`       | Yes      | 1–200 characters with no surrounding whitespace         |
| `subtitle`    | No       | 1–300 characters with no surrounding whitespace         |
| `publishedAt` | Yes      | Quoted ISO 8601 timestamp including a timezone          |

The body must contain non-whitespace Markdown and follow the
[content style guide](content-style.md). Publication status, author, and
byline are not part of the local file contract.

`publishedAt` is the intended publication timestamp and appears in the local
preview. Entering it does not upload, schedule, or publish the article. Until a
separate scheduling workflow exists, the future publishing command will require
an explicit author action and reject publication before this timestamp. Keep the
timestamp quoted so YAML preserves the explicit timezone for validation.

## Validate

Validate every private article:

```sh
npm run article:validate
```

Pass a Markdown file or another directory to validate only that input:

```sh
npm run article:validate -- authoring/articles/example-article.md
```

Validation checks the frontmatter, database-compatible field limits, duplicate
slugs within a directory, and nonempty body content. Errors identify the local
filename and invalid field without printing the article body or an absolute
private path.

## Preview

Start the local-only preview server:

```sh
npm run article:preview
```

The command validates all private articles and prints a route for each one, such
as `http://localhost:4321/preview/articles/example-article/`. The preview uses
the production `ArticleLayout` and secure `ArticleBody` renderer, including the
publication date entered in frontmatter.

The preview command does not require Supabase credentials and does not write to
the database. Preview routes are generated only while this command supplies the
ignored authoring directory; normal local, CI, Vercel preview, and production
builds do not expose private files.

## Review a private article

Before publishing is implemented, the author-facing review consists entirely of
local validation and preview:

1. Run `npm run article:validate` and resolve every reported error.
2. Run `npm run article:preview` and open the route printed for the article.
3. Confirm the title, optional subtitle, publication date, body structure,
   links, quotations, and footnotes render as intended.
4. Review a representative desktop width and a narrow mobile width, including
   keyboard navigation and 200% zoom.

Completing this review does not upload, schedule, or publish the article. The
publishing workflow will add its own dry-run, non-production mutation,
deployment, and recovery checks when it is implemented.

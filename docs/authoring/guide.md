# Local article authoring

Private article source lives in `authoring/articles/` on the author's computer.
The directory is Git-ignored and ordinary builds do not read it. Do not place
private writing in test fixtures, screenshots, terminal output, or any other
tracked path.

Before publishing for the first time, complete the
[authoring setup](setup.md).

## Workflow at a glance

1. Write, validate, and preview the private Markdown file locally.
2. Start the guided publishing command.
3. Choose whether to upload to Preview, review the database-backed site, and
   choose whether to continue to Production.
4. Confirm Production publishing. Production requests a Vercel deployment
   automatically.

The guided command pauses at every change boundary and accepts an explicit stop.
Preview and Production remain separate, and no prompt advances to Production
without the author's confirmation.

## Create an article

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
preview. Entering it does not upload, schedule, or publish the article. The
publishing command requires an explicit author action and rejects publication
before this timestamp. Keep the timestamp quoted so YAML preserves the explicit
timezone for validation.

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

To validate and preview one article, pass its Markdown file:

```sh
npm run article:preview -- authoring/articles/example-article.md
```

The command validates all private articles and prints a route for each one, such
as `http://localhost:4321/preview/articles/example-article/`. When a file is
provided, it validates and exposes only that article. The preview uses the
production `ArticleLayout` and secure `ArticleBody` renderer, including the
publication date entered in frontmatter.

The preview command does not require Supabase credentials and does not write to
the database. Preview routes are generated only while this command supplies the
ignored authoring directory; normal local, CI, Vercel preview, and production
builds do not expose private files.

## Review a private article

Before publishing, complete this local review:

1. Run `npm run article:validate` and resolve every reported error.
2. Run `npm run article:preview -- <article-file>` and open the route printed for
   the article.
3. Confirm the title, optional subtitle, publication date, body structure,
   links, quotations, and footnotes render as intended.
4. Review a representative desktop width and a narrow mobile width, including
   keyboard navigation and 200% zoom.

Completing this review does not upload, schedule, or publish the article.

## Configure publishing

Complete the one-time [authoring setup](setup.md) before using the publishing
commands. It explains which Preview and Production credentials belong in each
ignored environment file.

## Publish

Start the complete guided workflow with one article file:

```sh
npm run article:publish -- authoring/articles/example-article.md
```

The command:

1. Validates the private article.
2. Reports whether Preview would create, update, or leave it unchanged.
3. Accepts `continue` or `stop` before a Preview write.
4. Builds and serves the database-backed Preview homepage and article locally.
5. Leaves that server running while the author reviews both URLs.
6. Accepts `continue` or `stop` after review, then closes the local server.
7. Reports the Production change and accepts either `publish <slug>` or `stop`.
8. Writes the confirmed article to Production and requests a Vercel deployment.

Stopping before the Preview upload changes neither environment. Stopping after
the Preview upload leaves the reviewed Preview row intact but does not change
Production. An unchanged environment is not rewritten, and unchanged Production
does not request another deployment.

The local database-backed review uses the Preview publishable configuration from
`.env.local`. A Preview database change does not trigger a permanent Vercel
deployment.

### Target one environment

Environment-specific commands remain available for troubleshooting and
recovery. Without `--apply`, they are read-only dry runs:

```sh
npm run article:publish -- authoring/articles/example-article.md --environment preview
npm run article:publish -- authoring/articles/example-article.md --environment preview --apply
```

Production uses the same targeted form and retains its typed confirmation:

```sh
npm run article:publish -- authoring/articles/example-article.md --environment production
npm run article:publish -- authoring/articles/example-article.md --environment production --apply
```

A successful Production change triggers the Vercel build. Changing a slug
creates a separate article; archive the old slug explicitly after verifying the
new one.

## Unpublish

Unpublishing archives an article without deleting its content or publication
date. Preview it first, then apply it to the intended environment:

```sh
npm run article:unpublish -- example-article --environment preview
npm run article:unpublish -- example-article --environment preview --apply
```

Production follows the same dry-run and apply sequence and asks you to type
`unpublish <slug>`. A successful Production archive triggers a static rebuild so
the article disappears from public routes and listings.

If Supabase changes successfully but the Vercel Deploy Hook fails, the command
says that the database change was retained. Redeploy the current Production
commit from the Vercel dashboard, then verify the public site. Do not repeat the
database mutation merely to force another build.

# Database development

Supabase provides the local PostgreSQL environment and the secured article data
model ([ADR 0002](../architecture/decisions/0002-use-supabase-for-application-data.md)).
Article bodies are stored as Markdown
([ADR 0003](../architecture/decisions/0003-store-article-bodies-as-markdown.md)).
Preview and Production use separate hosted Supabase projects. Both run in the
same region and receive schema changes from this repository's migrations; local
development remains isolated in the local stack.

## Prerequisites

- Node.js 24 and npm
- A running Docker-compatible container runtime

The Supabase CLI is pinned as a development dependency. Use the repository's
`npm run db:*` commands rather than relying on a separately installed global
version.

## Local workflow

Install dependencies and start the local services:

```sh
npm install
npm run db:start
```

Supabase Studio is available at `http://127.0.0.1:55323`. The local API and
database use the ports recorded in `supabase/config.toml`. Never expose the local
stack to external traffic; it uses development credentials and is not hardened
for production.

Useful commands:

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `npm run db:start`  | Start the local services and apply committed SQL.          |
| `npm run db:status` | Show service URLs and confirm local health.                |
| `npm run db:reset`  | Recreate the local database from migrations and seed data. |
| `npm run db:test`   | Run database behavior and policy tests.                    |
| `npm run db:types`  | Regenerate TypeScript types from the local schema.         |
| `npm run db:stop`   | Stop the local services while preserving local state.      |

Run `npm run db:reset` after changing migrations, policies, or seed data. A clean
reset is the proof that another contributor can reproduce the database without
Dashboard-only changes.

After changing the schema, regenerate `src/types/database.ts` and commit the
result. CI fails when the generated types do not match the migration-defined
schema.

## Article model

The `public.articles` table owns article identity, Markdown source, and the
publication lifecycle:

| Field           | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `id`            | Stable internal UUID and future relationship target. |
| `slug`          | Unique lowercase kebab-case URL identifier.          |
| `title`         | Required editorial title.                            |
| `subtitle`      | Optional editorial subtitle.                         |
| `body_markdown` | Required Markdown source.                            |
| `status`        | `draft`, `published`, or `archived`.                 |
| `published_at`  | Display date and public-visibility threshold.        |
| `created_at`    | Record creation time.                                |
| `updated_at`    | Automatically maintained modification time.          |

An article can have multiple images. Each image is represented by a row in
`article_images` linked to the article. The row stores a stable article-local
reference, Storage path, required alt text and pixel dimensions, and optional
caption and credit. The article may identify one of those rows as its lead
image. The storage decision and future authoring contract are recorded in
[ADR 0007](../architecture/decisions/0007-store-published-article-images-in-supabase-storage.md).

Draft articles have never been published and have no publication date.
Published and archived articles retain a publication date; only published rows
whose date has arrived are public. Archiving therefore removes public access
without erasing publication history. The model does not include authors,
comments, categories, or images before those features have approved behavior.

The anonymous Data API role has `select` permission only, filtered by Row Level
Security. It cannot retrieve drafts or archived rows and has no write grants.

The local publishing commands use a separate server-only Supabase secret key to
create, update, and archive articles
([ADR 0006](../architecture/decisions/0006-publish-articles-with-a-local-administrative-command.md)).
That key bypasses Row Level Security and belongs only in the author's ignored
`.env.publish.preview` or `.env.publish.production` file. It must not be used by
reader-facing application code, Vercel, CI, or the ordinary `.env.local` build
file.
The administrative role receives only `select`, `insert`, and `update` table
privileges; it does not receive `delete`.

## Article image storage

Published article images use the public `article-images` Storage bucket. Public
access applies to downloads only. Anonymous clients have no upload, update, or
delete grant or policy; image publishing performs writes
with the same environment-specific secret key used for article mutations.

The bucket accepts JPEG, PNG, and WebP objects up to 5 MiB. Object paths contain
the article slug and a content digest, while `article_images` rows hold
editorial metadata. Each reference is unique within its article and is intended
to remain stable when the underlying file changes. Anonymous clients may read
metadata only for images belonging to currently published articles. Preview and
Production projects each own a separate bucket so an upload cannot cross
environment boundaries.

## Application access

Reader-facing code accesses articles through `src/data/articles.ts`, rather than
constructing Supabase queries inside pages. It provides a newest-first published
article list and a published-article lookup by slug. An empty publication returns
an empty list, an unknown slug returns `null`, and database failures throw an
`ArticleDataError` so callers do not confuse an outage with missing content.
When a published article selects a lead image, the repository resolves
`articles.lead_image_id` through `article_images` and constructs the public
Storage URL during the build.

The server-only client in `src/lib/supabase/server.ts` requires
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Copy `.env.example` to
`.env.local` and fill in values for the Supabase environment being used. Local
values are shown by `npm run db:status`; never commit the resulting file. These
variables intentionally omit Astro's `PUBLIC_` prefix so application code
cannot expose them to browser bundles by default.

Astro retrieves article data while producing a static build
([ADR 0004](../architecture/decisions/0004-retrieve-articles-at-build-time.md)).
Production publishing therefore triggers a Vercel deployment before changed
content appears on the site.

## Repository ownership

- `supabase/config.toml` defines reproducible local service settings.
- `supabase/migrations/` contains ordered, immutable schema changes.
- `supabase/seed.sql` contains fictional, non-private development fixtures.
- `src/types/database.ts` contains generated schema types and is refreshed with
  `npm run db:types`.

Do not edit a hosted database through the Dashboard without capturing the same
change in a migration. Never commit CLI tokens, database passwords, API keys,
private drafts, or hosted project identifiers that reveal credentials.

## Environment boundaries

| Environment       | Database                                         |
| ----------------- | ------------------------------------------------ |
| Local development | Local Supabase stack managed by this repository  |
| Vercel preview    | `For Your Consideration - Preview` in West US    |
| Production        | `For Your Consideration - Production` in West US |

The hosted projects are deliberately separate. Preview cannot read or mutate
Production data, and neither hosted database contains repository seed fixtures.
Preview fixtures will be introduced only with explicit ownership and cleanup
safeguards.

## Hosted migration workflow

Treat linking and pushing as deliberate environment-specific operations. Never
assume the currently linked project is safe to change.

1. Confirm the intended project name and reference in the Supabase Dashboard or
   with `npx supabase projects list`.
2. Link explicitly with `npx supabase link --project-ref <project-reference>`.
3. Inspect pending changes with `npx supabase db push --dry-run`.
4. Apply the reviewed migrations with `npx supabase db push`.
5. Verify anonymous reads and write denial against the hosted Data API.

Apply and verify Preview before Production. Obtain explicit authorization before
changing Production. Do not use `npm run db:reset`, `--include-seed`, or the SQL
seed file against either hosted project. Hosted rollbacks use a reviewed
corrective migration; do not rewrite or delete an applied migration.

## References

- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase deployment and branching](https://supabase.com/docs/guides/deployment)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

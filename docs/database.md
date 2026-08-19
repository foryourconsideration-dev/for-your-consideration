# Database development

Supabase provides the local PostgreSQL environment and the secured article data
model ([ADR 0002](architecture/decisions/0002-use-supabase-for-application-data.md)).
Article bodies are stored as Markdown
([ADR 0003](architecture/decisions/0003-store-article-bodies-as-markdown.md)).
This repository is not yet linked to a hosted Supabase project.

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

Draft articles have never been published and have no publication date.
Published and archived articles retain a publication date; only published rows
whose date has arrived are public. Archiving therefore removes public access
without erasing publication history. The model does not include authors,
comments, categories, or images before those features have approved behavior.

The anonymous Data API role has `select` permission only, filtered by Row Level
Security. It cannot retrieve drafts or archived rows and has no write grants.

## Application access

Reader-facing code accesses articles through `src/data/articles.ts`, rather than
constructing Supabase queries inside pages. It provides a newest-first published
article list and a published-article lookup by slug. An empty publication returns
an empty list, an unknown slug returns `null`, and database failures throw an
`ArticleDataError` so callers do not confuse an outage with missing content.

The server-only client in `src/lib/supabase/server.ts` requires
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Copy `.env.example` to `.env` and
fill in values for the Supabase environment being used. Local values are shown
by `npm run db:status`; never commit the resulting `.env` file. These variables
intentionally omit Astro's `PUBLIC_` prefix so application code cannot expose
them to browser bundles by default.

Astro retrieves article data while producing a static build
([ADR 0004](architecture/decisions/0004-retrieve-articles-at-build-time.md)).
Publishing will therefore need to trigger a Vercel deployment before new content
appears on the site.

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

| Environment       | Database                                        |
| ----------------- | ----------------------------------------------- |
| Local development | Local Supabase stack managed by this repository |
| Vercel preview    | Not connected yet                               |
| Production        | Not connected yet                               |

The hosted preview and production strategy will be selected when deployed data
access is implemented. This avoids creating remote projects or choosing a paid
branching model before the application needs either one.

## References

- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase deployment and branching](https://supabase.com/docs/guides/deployment)

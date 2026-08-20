# Authoring setup

Complete this setup once before publishing an article. Private writing and all
credentials remain in Git-ignored local files.

## Prepare the hosted databases

Before the first article is published, an engineering contributor must apply
the repository's migrations to both Preview and Production. Follow the
[hosted migration workflow](../engineering/database.md#hosted-migration-workflow),
applying and verifying Preview before Production. This is project setup, not a
step repeated for each article.

## Create the private article directory

From the repository root, run:

```sh
mkdir -p authoring/articles
```

Store private Markdown articles in this directory. The files remain local even
after their contents are published to Supabase.

## Configure Preview publishing

Create the ignored Preview configuration from the tracked example:

```sh
cp .env.publish.example .env.publish.preview
```

Add the Preview Supabase project URL and its `sb_secret_...` key. Leave
`VERCEL_DEPLOY_HOOK_URL` empty because publishing to Preview does not trigger a
Vercel deployment.

## Configure database-backed Preview review

Create or edit the ignored `.env.local` file in the repository root:

```text
SUPABASE_URL=https://your-preview-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Both values must come from the Preview Supabase project. Use the
`sb_publishable_...` key here, not the `sb_secret_...` key. This configuration
lets the guided publishing command build and serve published Preview articles
for local review.

## Configure Production publishing

Create the ignored Production configuration separately:

```sh
cp .env.publish.example .env.publish.production
```

Add the Production Supabase project URL, its distinct `sb_secret_...` key, and
the Vercel Deploy Hook URL for the production branch. Do not copy Preview values
into this file.

## Configuration reference

| File                      | Purpose                                      | Key type            |
| ------------------------- | -------------------------------------------- | ------------------- |
| `.env.local`              | Local database-backed Preview site builds    | Preview publishable |
| `.env.publish.preview`    | Administrative writes to Preview             | Preview secret      |
| `.env.publish.production` | Administrative writes and Production deploys | Production secret   |

Secret keys bypass Row Level Security. Never commit these files, put their
values in browser code, or copy `SUPABASE_SECRET_KEY` or
`VERCEL_DEPLOY_HOOK_URL` into `.env.local`. The authoring commands report
missing or invalid configuration without printing credentials.

After setup, follow the [local authoring guide](guide.md) to create, preview,
and publish an article.

# 0006: Publish articles with a local administrative command

## Status

Accepted

## Context

Validated private Markdown must reach Supabase without entering Git history or
exposing administrative credentials to the reader-facing application. Publishing
also has to rebuild the static site selected in
[ADR 0004](0004-retrieve-articles-at-build-time.md). The sole author needs a
deliberate workflow that distinguishes Preview from Production, makes repeated
runs safe, and can remove a public article without deleting its history.

### Alternatives considered

A browser-based content-management system would make editing and publishing
more familiar, but it would add authentication, an administrative application,
and another attack surface before multiple authors require them. Direct edits in
Supabase Studio would avoid application code, but they would bypass the existing
file validation and rendering workflow and make safe, repeatable publishing
dependent on manual database work. A hosted API endpoint would centralize the
write boundary, but it would still require administrative authentication and a
server runtime for a workflow used from one trusted computer.

## Decision

Publish and unpublish through repository-owned commands run locally by the sole
author. Keep separate ignored environment files for Preview and Production, each
containing that Supabase project's server-only secret key. Require an explicit
environment on every command, default to a read-only dry run, and require
`--apply` before any mutation. Require an additional typed confirmation before a
Production mutation.

Publishing consumes the validated local Markdown contract from
[ADR 0005](0005-author-and-preview-articles-locally.md). It creates or updates
one row by slug and sets it to `published`; a changed slug is a new article.
Reject publication before the entered `publishedAt` timestamp rather than
implementing scheduling. Treat an identical rerun as unchanged and perform no
write. Unpublishing changes a published row to `archived`, retains its
publication timestamp, and never deletes it.

Preview publishing is available for non-production verification but does not
request a permanent Vercel preview deployment. A successful Production change
posts to a branch-specific Vercel Deploy Hook so the static site rebuilds. Do not
request a deployment when the database is unchanged. If the database mutation
succeeds but the hook fails, retain the mutation and recover by redeploying
Production from Vercel.

## Consequences

- Private article source and administrative credentials remain outside Git and
  browser bundles.
- A dry run shows create, update, archive, or unchanged behavior before a write.
- Preview and Production credentials cannot be selected implicitly or shared by
  one environment file.
- Idempotent reruns avoid duplicate rows, unnecessary updates, and unnecessary
  deployments.
- Publishing remains a trusted local operation; the author must protect the
  computer and ignored credential files.
- The Supabase secret key bypasses Row Level Security and must never be used by
  reader-facing code, Vercel builds, CI, or browser code.
- Production content changes become public only after the triggered static build
  succeeds.
- Slug changes require publishing the new slug and separately archiving the old
  slug.
- A future multi-author workflow should replace this local trust boundary with
  authenticated, auditable server-side administration.

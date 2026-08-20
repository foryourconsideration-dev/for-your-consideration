# 0005: Author and preview articles locally

## Status

Accepted

## Context

Private writing must remain outside the public repository and should not enter
the database until the author deliberately publishes it. The author needs clear
validation and a production-equivalent preview without requiring administrative
credentials or adding a browser-based content-management system.

### Alternatives considered

Astro content collections would provide a built-in authoring model, but they are
designed around repository-managed content and would place private writing in the
public source workflow. Storing drafts in Supabase would centralize them, but it
would require an authenticated administrative interface or direct database work
before either is needed. A custom frontmatter parser and manual field checks
would avoid a direct validation dependency but duplicate behavior maintained by
Astro and Zod.

## Decision

Author private articles as Git-ignored Markdown files in
`authoring/articles/`, with one file per article. Use YAML frontmatter for the
required `slug`, `title`, and `publishedAt` and optional `subtitle`; keep
publication state and attribution outside the local file contract. Require
`publishedAt` to be a quoted ISO 8601 timestamp with an explicit timezone so the
YAML parser preserves the authored value for validation.

Parse frontmatter with Astro's existing parser and validate it with Zod against
the database-compatible field constraints. Provide dedicated commands to
validate the private files and preview them locally. Generate preview routes
only when the preview command supplies the ignored directory, and render article
bodies through the production article layout and secure Markdown renderer. Show
the intended publication timestamp in the preview without treating preview as a
publishing action.

Use a fictional, public fixture to test preview generation in CI. Ordinary
local, preview, and production builds must not generate private preview routes.

This decision defines authoring and preview only. The administrative publishing
boundary, credentials, database mutation behavior, and deployment trigger will
be decided separately when publishing is implemented.

## Consequences

- Private article files remain outside Git history and ordinary build output.
- Local previews use production-equivalent rendering without database credentials
  or database mutations.
- Frontmatter validation fails before preview when metadata does not match the
  application and database contract.
- Entering a publication timestamp does not schedule, upload, or publish an
  article; publishing still requires a separate explicit author action.
- Zod becomes a direct runtime dependency so validation behavior and upgrades
  remain explicit.
- A public fixture tests the workflow without exposing real drafts or published
  writing.
- The author is responsible for privately backing up local writing.
- A future publishing workflow must consume this validated file contract without
  weakening the private-content boundary.

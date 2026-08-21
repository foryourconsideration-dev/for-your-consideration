# 0007: Store published article images in Supabase Storage

## Status

Accepted

## Context

Articles need multiple images without placing private authoring assets in Git or
exposing an administrative upload surface in the reader-facing site. Images may
appear as article metadata, such as a lead image, or be referenced from article
Markdown. The storage foundation must preserve the existing local authoring,
Preview, Production, and static-build boundaries while keeping image references
stable across environments and file replacements.

Reader pages also need intrinsic dimensions, accessible alternatives, and
optional editorial context. Those values belong to the image as used by an
article rather than to the binary Storage object alone.

### Alternatives considered

Committing images to the repository would make Astro's build-time optimization
straightforward, but it would move editorial assets into public Git history
before publication. Storing image bytes in Postgres would keep article data in
one system, but would make database rows, backups, and article queries carry
binary data. A separate image host would provide specialized transformations,
but would add another service, credential boundary, and publishing integration.

Storing image metadata directly on the article row works for one lead image but
does not represent multiple inline images. Embedding database UUIDs, public URLs,
or content-digest paths in Markdown would couple authored content to one
environment or one version of a file. Private Storage objects with expiring
signed URLs would protect every read, but the URLs are a poor fit for permanently
generated static pages.

## Decision

Store published article image files in a public `article-images` Supabase
Storage bucket. Public access applies only to downloads; uploads remain
restricted to a server-only secret key. Preview and Production continue to use
separate Supabase projects and therefore separate copies of each image.

Store image identity and editorial metadata in `public.article_images`. Each row
belongs to one article and contains a stable article-local reference, an
immutable Storage path, required alt text and intrinsic dimensions, and optional
caption and credit. References are unique within an article, and Storage paths
are globally unique. An article may designate one of its own image rows as its
lead image; the database enforces that ownership relationship.

Use article-local references as the authoring boundary. A lead-image
frontmatter value and an inline Markdown construct may both refer to a readable
identifier such as `harbor-at-dawn`. The publishing and rendering layers will
resolve that identifier within the current article. They must not place database
UUIDs, environment-specific public URLs, or content-digest paths in authored
Markdown. The private authoring manifest uses an `images` list whose entries
contain `ref`, `source`, `alt`, and optional `caption` and `credit` values.
`source` is relative to the private article file; `ref` is the stable identity.
`lead_image: harbor-at-dawn` selects an entry from that list. A future inline
construct may use `::image{ref="harbor-at-dawn"}` to select the same entry.

Accept JPEG, PNG, and WebP files up to 5 MiB. Publishing rejects animated or
malformed files, determines dimensions from the file rather
than trusting authored values, and upload each file under a path containing its
article slug and SHA-256 content digest.

Publishing resolves the manifest separately in each environment. It creates an
unpublished article row for a new slug, uploads each validated file, and upserts
metadata by `(article_id, reference)`. Only after all required uploads and
metadata writes succeed does it set `lead_image_id` to the resolved row owned by
that article and publish the article. An existing published article therefore
keeps its last valid relationship if an image write fails. Publishing never
deletes superseded metadata rows or Storage objects.

This decision establishes the database, Storage, access-control, authoring, and
publishing reference contracts. Inline Markdown parsing, reader-facing
rendering, and asset cleanup remain separate changes.

## Consequences

- Private image files remain outside Git and ordinary builds.
- One article can own multiple images and select one of them as its lead image.
- Stable, readable references can survive file replacement and remain identical
  across Preview and Production.
- Image metadata is publicly readable only when its parent article is currently
  published; anonymous writes remain denied.
- The publishing secret can write image records and Storage objects and must
  remain confined to trusted server-controlled tooling.
- Content-addressed paths make unchanged uploads idempotent and avoid stale CDN
  responses when an image changes.
- A database failure after a successful upload can leave an unreferenced object;
  removing superseded and orphaned assets is deferred until a cleanup workflow
  is designed.
- The first rendering implementation does not need to support generated image
  variants, art direction, or automatic social-preview selection.

# 0003: Store article bodies as Markdown

## Status

Accepted

## Context

Article bodies need a private, portable source format that supports long-form
editorial structure without storing presentation-specific HTML. The format must
work with local authoring and validation, database storage, and a later secure
rendering pipeline.

### Alternatives considered

Stored HTML would make reads direct but would couple content to presentation and
require every publishing path to produce trusted, sanitized markup. Structured
content blocks would make individual elements explicit but would add a custom
editing and rendering model before the publication needs one. Repository-based
Markdown would provide the same authoring format but would place published text
in public Git history.

## Decision

Store each article body as Markdown text in Supabase. Treat the stored value as
source content, not trusted HTML. A later rendering boundary will define the
supported Markdown syntax, raw-HTML policy, sanitization, external-link
behavior, citations, and footnotes.

## Consequences

- Article source remains portable and readable outside the application.
- Content can stay outside the public repository while schema and rendering code
  remain reviewable.
- Rendering and sanitization become an explicit security boundary that must be
  tested before stored content is displayed.
- Rich structures outside the approved Markdown subset may require later syntax
  extensions or a different representation.
- Changing the parser requires compatibility testing against existing articles.

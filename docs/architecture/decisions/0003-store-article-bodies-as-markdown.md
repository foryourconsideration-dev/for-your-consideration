# 0003: Store article bodies as Markdown

## Status

Accepted

## Context

Article bodies need a private, portable source format that supports long-form
editorial structure without storing presentation-specific HTML. The format must
work with local authoring and validation, database storage, and a secure
rendering pipeline.

### Alternatives considered

Stored HTML would make reads direct but would couple content to presentation and
require every publishing path to produce trusted, sanitized markup. Structured
content blocks would make individual elements explicit but would add a custom
editing and rendering model before the publication needs one. Repository-based
Markdown would provide the same authoring format but would place published text
in public Git history.

For rendering, Astro's native Sätteri processor and its official
remark/rehype processor both produce the semantic elements and accessible
footnote structure the publication needs. Testing showed that Sätteri preserves
raw HTML and unsafe `javascript:` and `data:` link destinations without an
additional sanitizer. Adding a separate HTML-string sanitizer would split the
rendering policy across two processing models. The remark/rehype pipeline has a
mature tree-based sanitizer that can enforce the supported element and URL
allowlist before HTML is emitted.

## Decision

Store each article body as Markdown text in Supabase. Treat the stored value as
source content, not trusted HTML.

Render article Markdown with Astro's official remark/rehype processor and
`rehype-sanitize`. Enable GitHub-flavored Markdown for footnotes, apply smart
punctuation, discard raw HTML, restrict output to the documented editorial
element allowlist, and remove unsafe URL protocols. Links open in the current
tab. Footnotes render under a visible `Notes` heading with semantic references
and backlinks.

The supported authoring subset is documented in
[the content style guide](../../authoring/content-style.md).

## Consequences

- Article source remains portable and readable outside the application.
- Content can stay outside the public repository while schema and rendering code
  remain reviewable.
- Rendering and sanitization become an explicit security boundary that must be
  protected by behavior and malicious-input tests.
- The application adds Astro's official remark/rehype processor and
  `rehype-sanitize`; parser upgrades require compatibility and security testing.
- Rich structures outside the approved Markdown subset may require later syntax
  extensions or a different representation.
- Changing the parser requires compatibility testing against existing articles.

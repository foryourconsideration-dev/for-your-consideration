# 0001: Use Astro for the reader-facing site

## Status

Accepted

## Context

_For Your Consideration_ is a content-focused blog whose primary experience is
reading public articles. It should produce semantic HTML, load quickly, and avoid
shipping browser JavaScript when a page does not need it. The project also needs
TypeScript support and room for isolated interactivity later.

### Alternatives considered

Next.js provides a comprehensive React framework for interactive, full-stack
applications, but this site does not currently need a React runtime or its broader
application model. Eleventy offers a smaller static-site generator, but Astro
provides a more integrated typed component model and a direct path to selectively
interactive components if the product needs them.

## Decision

Use Astro with strict TypeScript for the reader-facing site. Do not add a UI
framework until a concrete feature requires one.

This decision does not determine when article data is retrieved or whether future
pages use static or request-time rendering. Make that decision when the Supabase
data flow is designed.

## Consequences

- Pages render to HTML with no client-side JavaScript by default.
- Interactivity can be added to individual components instead of the whole page.
- Contributors must learn Astro's component and routing conventions.
- If the product becomes primarily application-like rather than content-focused,
  revisit this decision.

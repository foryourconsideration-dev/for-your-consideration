# 0004: Retrieve articles at build time

## Status

Accepted

## Context

The reader-facing site needs published article data from Supabase while
preserving the static, low-JavaScript architecture selected for the initial
publication. The site has one author, publishes deliberately, and does not yet
need personalized or rapidly changing pages.

### Alternatives considered

Request-time rendering would make database changes visible without a new build,
but it would introduce a server runtime, caching policy, and reader-visible
database failure behavior before those are necessary. Fetching data in the
browser would keep the page shell static, but would delay core content, require
client-side JavaScript, and weaken the initial HTML delivered to readers and
crawlers.

## Decision

Retrieve published articles from Supabase during the Astro build and emit static
HTML. Build-time retrieval does not require every page to retrieve every
article. Each page queries only the data needed to generate it. The initial
article index may retrieve all published summaries while the publication
remains small; article pages retrieve individual articles by slug.

The publishing workflow must trigger a new Vercel deployment before a database
change becomes visible on the public site.

## Consequences

- Readers receive complete HTML without waiting on a browser-side data request.
- Readers' browsers do not query Supabase for article content.
- Ordinary page requests do not depend directly on Supabase availability.
- A failed article query fails the build rather than silently deploying missing
  content.
- Publishing, unpublishing, archiving, and correcting an article require a new
  deployment before the public site changes.
- Preview and production builds each need access to their intended Supabase
  environment.
- Revisit this decision if publication must be immediate, content changes very
  frequently, or reader-specific pages require request-time data.

insert into public.articles (
  id,
  slug,
  title,
  subtitle,
  body_markdown,
  status,
  published_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'published-article-one',
    'Published article one',
    'Article subtitle',
    E'Body paragraph.\n\n## Section heading\n\nBody paragraph.',
    'published',
    '2025-02-01T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'published-article-two',
    'Published article two',
    null,
    'Body paragraph.',
    'published',
    '2025-01-01T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'draft-article',
    'Draft article',
    null,
    'Body paragraph.',
    'draft',
    null
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'archived-article',
    'Archived article',
    null,
    'Body paragraph.',
    'archived',
    '2024-12-01T12:00:00Z'
  );

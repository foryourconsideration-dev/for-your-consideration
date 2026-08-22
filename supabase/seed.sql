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
    '10000000-0000-4000-8000-000000000005',
    'published-article-three',
    'Published article three with a longer title',
    null,
    'Body paragraph.',
    'published',
    '2024-12-01T12:00:00Z'
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

insert into public.article_images (
  id,
  article_id,
  reference,
  storage_path,
  alt,
  caption,
  credit,
  width,
  height
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'lead',
  'published-article-one/addc70685e351486c02902a3b9b5914a5154209bd22ac9daf64f6da42c069402.png',
  'Abstract oxblood quadrilateral on a warm gray background.',
  'A fictional image used to verify the article image workflow.',
  'Test fixture',
  1200,
  675
);

update public.articles
set lead_image_id = '20000000-0000-4000-8000-000000000001'
where id = '10000000-0000-4000-8000-000000000001';

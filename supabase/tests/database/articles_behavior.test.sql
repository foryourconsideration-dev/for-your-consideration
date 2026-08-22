begin;

select plan(12);

update public.articles set lead_image_id = null;
delete from public.article_images;
delete from public.articles;

select lives_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('valid-draft', 'Valid draft', 'Body paragraph.', 'draft', null)
  $$,
  'a valid draft is accepted'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('Invalid Slug', 'Invalid slug', 'Body paragraph.', 'draft', null)
  $$,
  '23514',
  null,
  'invalid slugs are rejected'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('blank-title', '   ', 'Body paragraph.', 'draft', null)
  $$,
  '23514',
  null,
  'blank titles are rejected'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('blank-body', 'Blank body', '   ', 'draft', null)
  $$,
  '23514',
  null,
  'blank Markdown bodies are rejected'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, subtitle, body_markdown, status, published_at)
    values ('blank-subtitle', 'Blank subtitle', '   ', 'Body paragraph.', 'draft', null)
  $$,
  '23514',
  null,
  'blank subtitles are rejected'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('invalid-status', 'Invalid status', 'Body paragraph.', 'deleted', null)
  $$,
  '23514',
  null,
  'unsupported statuses are rejected'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('dated-draft', 'Dated draft', 'Body paragraph.', 'draft', now())
  $$,
  '23514',
  null,
  'drafts cannot have publication dates'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status, published_at)
    values ('undated-published', 'Undated published', 'Body paragraph.', 'published', null)
  $$,
  '23514',
  null,
  'published articles require publication dates'
);

insert into public.articles (slug, title, body_markdown, status, published_at)
values
  ('visible-published', 'Visible published', 'Body paragraph.', 'published', now() - interval '1 day'),
  ('future-published', 'Future published', 'Body paragraph.', 'published', now() + interval '1 day'),
  ('private-draft', 'Private draft', 'Body paragraph.', 'draft', null),
  ('private-archived', 'Private archived', 'Body paragraph.', 'archived', now() - interval '2 days');

set local role anon;

select results_eq(
  $$ select slug from public.articles order by slug $$,
  $$ values ('visible-published'::text) $$,
  'anonymous readers see only currently published articles'
);

select throws_ok(
  $$
    insert into public.articles (slug, title, body_markdown, status)
    values ('public-write', 'Public write', 'Body paragraph.', 'draft')
  $$,
  '42501',
  null,
  'anonymous inserts are denied'
);

select throws_ok(
  $$ update public.articles set title = 'Changed' where slug = 'visible-published' $$,
  '42501',
  null,
  'anonymous updates are denied'
);

select throws_ok(
  $$ delete from public.articles where slug = 'visible-published' $$,
  '42501',
  null,
  'anonymous deletes are denied'
);

select * from finish();

rollback;

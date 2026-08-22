begin;

select plan(28);

select is(
  (
    select count(*)::integer
    from storage.buckets
    where id = 'article-images'
  ),
  1,
  'the article image bucket exists once'
);

select ok(
  (
    select public
    from storage.buckets
    where id = 'article-images'
  ),
  'article images are publicly readable'
);

select is(
  (
    select file_size_limit
    from storage.buckets
    where id = 'article-images'
  ),
  5242880::bigint,
  'article images are limited to 5 MiB'
);

select results_eq(
  $$
    select unnest(allowed_mime_types)
    from storage.buckets
    where id = 'article-images'
    order by 1
  $$,
  $$ values ('image/jpeg'::text), ('image/png'::text), ('image/webp'::text) $$,
  'the bucket accepts only the approved image MIME types'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'storage.objects'::regclass
  ),
  'row level security protects Storage objects'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles @> array['anon'::name]
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  0,
  'no Storage policy permits anonymous writes'
);

select ok(
  to_regclass('public.article_images') is not null,
  'article images table exists'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'article_images'
  ),
  11,
  'article images table has the approved columns'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.article_images'::regclass
  ),
  'row level security protects article image metadata'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'article_images'
      and policyname = 'Published article images are publicly readable'
  ),
  1,
  'the published image metadata policy exists once'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'article_images'
      and indexname = 'article_images_article_id_idx'
  ),
  'article image lookup index exists'
);

select ok(
  exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'article_images'
      and trigger_name = 'set_article_images_updated_at'
  ),
  'article image updated_at trigger exists'
);

select ok(
  has_table_privilege('anon', 'public.article_images', 'select'),
  'anonymous readers can select image metadata'
);

select ok(
  not has_table_privilege('anon', 'public.article_images', 'insert'),
  'anonymous readers cannot insert image metadata'
);

select ok(
  not has_table_privilege('anon', 'public.article_images', 'update'),
  'anonymous readers cannot update image metadata'
);

select ok(
  not has_table_privilege('anon', 'public.article_images', 'delete'),
  'anonymous readers cannot delete image metadata'
);

select ok(
  has_table_privilege('service_role', 'public.article_images', 'select'),
  'the administrative role can inspect image metadata'
);

select ok(
  has_table_privilege('service_role', 'public.article_images', 'insert'),
  'the administrative role can create image metadata'
);

select ok(
  has_table_privilege('service_role', 'public.article_images', 'update'),
  'the administrative role can update image metadata'
);

select ok(
  not has_table_privilege('service_role', 'public.article_images', 'delete'),
  'the administrative role cannot delete image metadata'
);

insert into public.articles (slug, title, body_markdown, status, published_at)
values
  ('image-article', 'Image article', 'Body paragraph.', 'published', now() - interval '1 day'),
  ('other-article', 'Other article', 'Body paragraph.', 'published', now() - interval '1 day'),
  ('future-image-article', 'Future image article', 'Body paragraph.', 'published', now() + interval '1 day'),
  ('draft-image-article', 'Draft image article', 'Body paragraph.', 'draft', null);

select lives_ok(
  $$
    insert into public.article_images (
      article_id,
      reference,
      storage_path,
      alt,
      caption,
      credit,
      width,
      height
    )
    values
      (
        (select id from public.articles where slug = 'image-article'),
        'harbor-at-dawn',
        'image-article/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
        'A harbor at dawn.',
        'Morning light over the harbor.',
        'Photograph by Example Artist.',
        1600,
        900
      ),
      (
        (select id from public.articles where slug = 'image-article'),
        'harbor-at-night',
        'image-article/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp',
        'A harbor at night.',
        null,
        null,
        1200,
        800
      )
  $$,
  'an article can own multiple complete image records'
);

select throws_ok(
  $$
    insert into public.article_images (
      article_id,
      reference,
      storage_path,
      alt,
      width,
      height
    )
    values (
      (select id from public.articles where slug = 'image-article'),
      'harbor-at-dawn',
      'image-article/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.png',
      'A different harbor image.',
      1000,
      1000
    )
  $$,
  '23505',
  null,
  'image references are unique within an article'
);

select throws_ok(
  $$
    insert into public.article_images (
      article_id,
      reference,
      storage_path,
      alt,
      width,
      height
    )
    values (
      (select id from public.articles where slug = 'image-article'),
      'blank-alt',
      'image-article/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.jpg',
      '   ',
      1000,
      1000
    )
  $$,
  '23514',
  null,
  'blank image alt text is rejected'
);

select throws_ok(
  $$
    insert into public.article_images (
      article_id,
      reference,
      storage_path,
      alt,
      width,
      height
    )
    values (
      (select id from public.articles where slug = 'image-article'),
      'oversized-image',
      'image-article/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.jpg',
      'An oversized image.',
      20001,
      1000
    )
  $$,
  '23514',
  null,
  'unsupported image dimensions are rejected'
);

select throws_ok(
  $$
    update public.articles
    set lead_image_id = (
      select id
      from public.article_images
      where reference = 'harbor-at-dawn'
    )
    where slug = 'other-article'
  $$,
  '23503',
  null,
  'an article cannot use another article image as its lead image'
);

select lives_ok(
  $$
    update public.articles
    set lead_image_id = (
      select id
      from public.article_images
      where reference = 'harbor-at-dawn'
    )
    where slug = 'image-article'
  $$,
  'an article can select one of its own images as its lead image'
);

insert into public.article_images (
  article_id,
  reference,
  storage_path,
  alt,
  width,
  height
)
values
  (
    (select id from public.articles where slug = 'future-image-article'),
    'future-image',
    'future-image-article/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.jpg',
    'A future image.',
    1000,
    1000
  ),
  (
    (select id from public.articles where slug = 'draft-image-article'),
    'draft-image',
    'draft-image-article/1111111111111111111111111111111111111111111111111111111111111111.jpg',
    'A draft image.',
    1000,
    1000
  );

set local role anon;

select results_eq(
  $$ select reference from public.article_images order by reference $$,
  $$ values ('harbor-at-dawn'::text), ('harbor-at-night'::text), ('lead'::text) $$,
  'anonymous readers see metadata only for currently published articles'
);

select throws_ok(
  $$
    insert into public.article_images (
      article_id,
      reference,
      storage_path,
      alt,
      width,
      height
    )
    values (
      (select id from public.articles where slug = 'image-article'),
      'public-write',
      'image-article/2222222222222222222222222222222222222222222222222222222222222222.jpg',
      'An unauthorized image.',
      1000,
      1000
    )
  $$,
  '42501',
  null,
  'anonymous image metadata writes are denied'
);

select * from finish();

rollback;

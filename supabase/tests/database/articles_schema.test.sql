begin;

select plan(11);

select ok(
  to_regclass('public.articles') is not null,
  'articles table exists'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'articles'
  ),
  9,
  'articles table has the approved columns'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.articles'::regclass
  ),
  'row level security is enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
      and policyname = 'Published articles are publicly readable'
  ),
  1,
  'the public read policy exists once'
);

select ok(
  has_table_privilege('anon', 'public.articles', 'select'),
  'anonymous readers have select permission'
);

select ok(
  not has_table_privilege('anon', 'public.articles', 'insert'),
  'anonymous readers have no insert permission'
);

select ok(
  not has_table_privilege('anon', 'public.articles', 'update'),
  'anonymous readers have no update permission'
);

select ok(
  not has_table_privilege('anon', 'public.articles', 'delete'),
  'anonymous readers have no delete permission'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.articles'::regclass
      and conname = 'articles_slug_key'
      and contype = 'u'
  ),
  'slug has a unique constraint'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'articles'
      and indexname = 'articles_published_at_idx'
  ),
  'published article ordering index exists'
);

select ok(
  exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'articles'
      and trigger_name = 'set_articles_updated_at'
  ),
  'updated_at trigger exists'
);

select * from finish();

rollback;

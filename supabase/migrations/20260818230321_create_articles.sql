create schema if not exists private;

revoke all on schema private from public;

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  subtitle text,
  body_markdown text not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_key unique (slug),
  constraint articles_slug_format_check check (
    char_length(slug) between 1 and 120
    and slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint articles_title_check check (
    title = btrim(title)
    and char_length(title) between 1 and 200
  ),
  constraint articles_subtitle_check check (
    subtitle is null
    or (
      subtitle = btrim(subtitle)
      and char_length(subtitle) between 1 and 300
    )
  ),
  constraint articles_body_markdown_check check (
    char_length(btrim(body_markdown)) > 0
  ),
  constraint articles_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint articles_publication_state_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  )
);

comment on table public.articles is
  'Editorial articles and their publication lifecycle.';

comment on column public.articles.body_markdown is
  'Trusted author source rendered through the application Markdown pipeline.';

create index articles_published_at_idx
  on public.articles (published_at desc)
  where status = 'published';

create function private.set_articles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_articles_updated_at() from public;

create trigger set_articles_updated_at
before update on public.articles
for each row
execute function private.set_articles_updated_at();

alter table public.articles enable row level security;

revoke all on table public.articles from anon, authenticated;
grant select on table public.articles to anon;

create policy "Published articles are publicly readable"
on public.articles
for select
to anon
using (
  status = 'published'
  and published_at <= now()
);

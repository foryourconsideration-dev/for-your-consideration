insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'article-images',
  'article-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id),
  reference text not null,
  storage_path text not null,
  alt text not null,
  caption text,
  credit text,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_images_id_article_id_key unique (id, article_id),
  constraint article_images_article_id_reference_key unique (article_id, reference),
  constraint article_images_storage_path_key unique (storage_path),
  constraint article_images_reference_check check (
    char_length(reference) between 1 and 120
    and reference = lower(reference)
    and reference ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint article_images_storage_path_check check (
    storage_path ~ '^[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{64}\.(jpg|png|webp)$'
  ),
  constraint article_images_alt_check check (
    alt = btrim(alt)
    and char_length(alt) between 1 and 500
  ),
  constraint article_images_caption_check check (
    caption is null
    or (
      caption = btrim(caption)
      and char_length(caption) between 1 and 500
    )
  ),
  constraint article_images_credit_check check (
    credit is null
    or (
      credit = btrim(credit)
      and char_length(credit) between 1 and 300
    )
  ),
  constraint article_images_width_check check (width between 1 and 20000),
  constraint article_images_height_check check (height between 1 and 20000)
);

comment on table public.article_images is
  'Editorial metadata and Storage identity for images belonging to articles.';

comment on column public.article_images.reference is
  'Stable article-local identifier for future authoring and Markdown references.';

comment on column public.article_images.storage_path is
  'Content-addressed path in the public article-images Storage bucket.';

alter table public.articles
  add column lead_image_id uuid,
  add constraint articles_lead_image_belongs_to_article_fkey
    foreign key (lead_image_id, id)
    references public.article_images (id, article_id);

create index article_images_article_id_idx
  on public.article_images (article_id);

create function private.set_article_images_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_article_images_updated_at() from public;

create trigger set_article_images_updated_at
before update on public.article_images
for each row
execute function private.set_article_images_updated_at();

alter table public.article_images enable row level security;

revoke all on table public.article_images from anon, authenticated;
grant select on table public.article_images to anon;
grant select, insert, update on table public.article_images to service_role;

create policy "Published article images are publicly readable"
on public.article_images
for select
to anon
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_images.article_id
      and articles.status = 'published'
      and articles.published_at <= now()
  )
);

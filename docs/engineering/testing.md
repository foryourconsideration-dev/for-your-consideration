# Testing

## Test local article preview

Contributors and CI use the fictional article in `test/fixtures/authoring/` to
test the same validation and rendering path as a private article without
exposing private writing.

With the local Supabase stack running, execute:

```sh
npm run article:validate -- test/fixtures/authoring
npm run build:authoring-fixture
npm run test:authoring-preview
npm run preview
```

While the preview server is running, open
`http://localhost:4321/preview/articles/fixture-article/`. Confirm that the
entered publication date and representative Markdown render correctly. The
special fixture build is for repository testing only; ordinary local, Vercel,
and production builds do not include this route.

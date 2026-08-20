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

## Test article publishing

Publishing unit tests cover argument parsing, dry-run planning, future-date
rejection, idempotency, archiving, isolated configuration, and a fake Deploy
Hook request:

```sh
npm test
```

With the local Supabase stack running and reset, the integration suite uses the
local administrative key to create, update, and archive one uniquely named
fictional test row:

```sh
npm run db:reset
npm run test:integration
```

The next local reset removes the archived test row. The administrative publishing
role intentionally has no delete permission. These tests do not read
`.env.publish.*`, contact Vercel, or mutate Preview or Production. Do not run
publishing tests with hosted credentials.

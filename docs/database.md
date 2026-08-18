# Database development

Supabase provides the local PostgreSQL environment and will host published
article data in a later change ([ADR 0002](architecture/decisions/0002-use-supabase-for-application-data.md)).
This repository currently configures local development only; it is not linked
to a hosted Supabase project.

## Prerequisites

- Node.js 24 and npm
- A running Docker-compatible container runtime

The Supabase CLI is pinned as a development dependency. Use the repository's
`npm run db:*` commands rather than relying on a separately installed global
version.

## Local workflow

Install dependencies and start the local services:

```sh
npm install
npm run db:start
```

Supabase Studio is available at `http://127.0.0.1:55323`. The local API and
database use the ports recorded in `supabase/config.toml`. Never expose the local
stack to external traffic; it uses development credentials and is not hardened
for production.

Useful commands:

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `npm run db:start`  | Start the local services and apply committed SQL.          |
| `npm run db:status` | Show service URLs and confirm local health.                |
| `npm run db:reset`  | Recreate the local database from migrations and seed data. |
| `npm run db:stop`   | Stop the local services while preserving local state.      |

Run `npm run db:reset` after changing migrations, policies, or seed data. A clean
reset is the proof that another contributor can reproduce the database without
Dashboard-only changes.

## Repository ownership

- `supabase/config.toml` defines reproducible local service settings.
- `supabase/migrations/` will contain ordered, immutable schema changes.
- `supabase/seed.sql` contains fictional, non-private development fixtures.
- Generated database types will be added with their refresh command when an
  application schema exists.

Do not edit a hosted database through the Dashboard without capturing the same
change in a migration. Never commit CLI tokens, database passwords, API keys,
private drafts, or hosted project identifiers that reveal credentials.

## Environment boundaries

| Environment       | Database                                        |
| ----------------- | ----------------------------------------------- |
| Local development | Local Supabase stack managed by this repository |
| Vercel preview    | Not connected yet                               |
| Production        | Not connected yet                               |

The hosted preview and production strategy will be selected when deployed data
access is implemented. This avoids creating remote projects or choosing a paid
branching model before the application needs either one.

## References

- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase deployment and branching](https://supabase.com/docs/guides/deployment)

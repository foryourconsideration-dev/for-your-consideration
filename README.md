# For Your Consideration

_For Your Consideration_ is a blog featuring opinions, commentary, and
reflections on a wide range of topics.

## Local development

The site uses Astro
([ADR 0001](docs/architecture/decisions/0001-use-astro.md)) and requires
Node.js 24 with npm. Local database work uses Supabase
([ADR 0002](docs/architecture/decisions/0002-use-supabase-for-application-data.md))
and also requires a running Docker-compatible container runtime.

### Setup

```sh
npm install
```

### Run locally

```sh
npm run dev
```

The development server is available at `http://localhost:4321`.

### Available commands

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the local development server.             |
| `npm run check`        | Check Astro and TypeScript files.               |
| `npm run db:start`     | Start the local Supabase stack.                 |
| `npm run db:stop`      | Stop the local Supabase stack.                  |
| `npm run db:status`    | Show local Supabase services and status.        |
| `npm run db:reset`     | Rebuild the local database from repository SQL. |
| `npm run db:test`      | Test database behavior and access policies.     |
| `npm run db:types`     | Regenerate TypeScript types from the schema.    |
| `npm run format`       | Format supported files with Prettier.           |
| `npm run format:check` | Check formatting without changing files.        |
| `npm run build`        | Create the production build in `dist/`.         |
| `npm run preview`      | Serve the production build locally.             |
| `npm run validate`     | Run every check required before a pull request. |

See the [database development guide](docs/database.md) before changing database
configuration, migrations, policies, or seed data.

## Deployments

Vercel builds pull-request previews and production deployments from the GitHub
repository. Preview deployments require a Vercel team login; production deploys
from `main` and remains public. See the [deployment guide](docs/deployment.md)
for verification and rollback steps.

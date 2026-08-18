# For Your Consideration

_For Your Consideration_ is a blog featuring opinions, commentary, and
reflections on a wide range of topics.

## Local development

The site uses Astro
([ADR 0001](docs/architecture/decisions/0001-use-astro.md)) and requires
Node.js 24 with npm.

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
| `npm run format`       | Format supported files with Prettier.           |
| `npm run format:check` | Check formatting without changing files.        |
| `npm run build`        | Create the production build in `dist/`.         |
| `npm run preview`      | Serve the production build locally.             |
| `npm run validate`     | Run every check required before a pull request. |

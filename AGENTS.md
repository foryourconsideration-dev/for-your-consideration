# Repository instructions for coding agents

These instructions apply to the entire repository. Read them before changing
anything.

## Required reading

Before every change, read:

1. `README.md`
2. This file
3. Every document relevant to the requested area

Also inspect the current tree, Git status, and recent history. Repository files,
not prior chat context, are the source of truth.

## Product and architecture constraints

- Preserve the restrained, typography-first literary reading experience.
- Keep published content in Supabase, not in the public repository.
- Keep drafts, unpublished writing, credentials, and future reader data private.
- Keep administrative writes server-controlled. Never expose privileged keys to
  browser code or public build output.
- Do not add reader accounts, comments, newsletters, analytics, archives,
  categories, or search unless an approved project decision requests them.
- Prefer the smallest solution that meets a current product, security,
  reliability, accessibility, or portfolio need.
- Do not introduce a dependency without explaining its concrete purpose in the
  PR. Obtain approval first when it materially affects architecture, security,
  product behavior, or maintenance.

## Before implementation

Restate the PR's single goal and non-goals. Identify affected boundaries,
material decisions, recommended choices and tradeoffs, and planned verification.
Wait for approval on unresolved material decisions. Do not expand scope or mix
opportunistic refactors into the change.

## File placement and naming

- Place application source in `src/`.
- Use lowercase kebab-case for new documentation filenames.
- Keep private authoring files out of the repository. Their ignored location will
  be established with the authoring workflow.
- Keep generated files only when their ownership and refresh command are
  documented.

## Validation

For application changes, run `npm run validate`. This checks formatting, Astro
and TypeScript, and the production build.

For database configuration, migration, policy, or seed changes, also start the
local stack and run `npm run db:reset`, `npm run db:test`, and
`npm run db:types`. A successful reset must recreate the database exclusively
from committed configuration, migrations, and seed data. Generated database
types must be committed without a remaining diff. Never run reset commands
against a linked or hosted project without explicit authorization.

Documentation-only changes require:

1. Review rendered Markdown.
2. Verify every relative link and heading target.
3. Inspect the diff for private content, secrets, absolute personal paths,
   generated debris, unrelated changes, and stale instructions.

Never invent or report commands that the repository does not provide.

Visible changes require stable desktop and narrow-mobile screenshots. Attach
transient review screenshots to the PR; do not commit them unless they are
durable documentation assets.

## Security and privacy

- Never commit secrets, real environment files, private drafts, production data,
  access tokens, or administrative credentials.
- Use redacted, fictional fixtures. Treat article content as private unless it is
  explicitly approved as a public fixture.
- Use public environment-variable prefixes only for values safe to ship to every
  reader. Server-only values must remain outside browser bundles.
- Do not log secrets, full drafts, or private filesystem paths.
- Stop and request direction before mutating production data or configuration.

## Documentation

Add or update documentation when a change introduces behavior, architecture, or
workflow that contributors need to understand. Prefer adding guidance alongside
the implementation it describes instead of documenting speculative decisions.

## Git and pull requests

- Branch names use `agent/<short-kebab-case-description>` for agent-authored work.
- Keep one coherent concern per PR.
- Use an imperative Conventional Commit subject.
- Finish each PR as one clean commit. Temporary local commits must be squashed
  before review.
- Complete `.github/pull_request_template.md` with exact evidence.
- Do not push, merge, deploy, or mutate production without explicit authorization.
- Never silently stage or overwrite unrelated work.

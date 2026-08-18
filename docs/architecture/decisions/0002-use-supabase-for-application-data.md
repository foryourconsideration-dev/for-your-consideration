# 0002: Use Supabase for application data

## Status

Accepted

## Context

_For Your Consideration_ needs a durable source for published articles that does
not place article contents or drafts in the public repository. The application
also needs explicit access controls, reproducible schema changes, typed data
access, and a local environment that can exercise the same database behavior
without mutating production.

### Alternatives considered

Repository-based Markdown would minimize infrastructure, but published writing
would become part of the public source history and publishing would remain tied
to code changes. A plain managed PostgreSQL service would preserve relational
modeling but require separate choices and integration for local orchestration,
an API boundary, and future file storage. A headless content-management system
would provide an editing interface, but would add a provider-specific content
model that is unnecessary for the planned local, single-author workflow.

## Decision

Use Supabase PostgreSQL as the system of record for application data. Manage the
database through committed configuration and migrations, enforce public access
with Row Level Security, and reproduce database behavior locally with the pinned
Supabase CLI and a Docker-compatible runtime.

This decision adopts Supabase for the database boundary. It does not require the
application to use Supabase Auth, Storage, Edge Functions, or every other
Supabase service. Hosted preview and production environment topology will be
decided when deployed data access is introduced.

## Consequences

- Published data can remain outside the public Git history while schema and
  policies remain reviewable.
- PostgreSQL constraints and Row Level Security become core security boundaries.
- Contributors need a Docker-compatible runtime for full local database work.
- The hosted application will depend on Supabase availability and operating
  conventions, and changing providers would require a data migration.
- Publishable keys may be exposed only where Row Level Security makes that safe;
  secret or administrative keys must remain server-controlled.
- Optional Supabase services must still be justified when a concrete feature
  introduces them.

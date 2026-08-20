# Deployments

Vercel hosts the site, building it directly from the GitHub repository. The
Astro application currently produces a static site in `dist`; it does not need
a Vercel adapter or repository-specific Vercel configuration.

## Environments

| Environment | Source                                    | Access                                            |
| ----------- | ----------------------------------------- | ------------------------------------------------- |
| Local       | A contributor's checkout                  | Local machine only                                |
| Preview     | Pull-request and non-`main` branch pushes | Vercel team members through Vercel Authentication |
| Production  | The `main` branch                         | Public                                            |

Vercel Authentication uses Standard Protection. Generated deployment URLs and
preview deployments require a logged-in member of the Vercel team, while the
primary production domain remains public. Create a shareable bypass link only
when a specific external reviewer needs temporary access.

## Deployment workflow

1. Run `npm run validate` locally.
2. Push the pull-request branch to GitHub.
3. Wait for the required `Format`, `Lint`, `Test`, `Validate`, and `Database`
   checks and the Vercel preview deployment to succeed.
4. Open the preview URL while logged in to Vercel and perform the applicable
   desktop, mobile, keyboard, and content checks.
5. Merge the approved pull request into `main`.
6. Confirm the resulting production deployment is ready and smoke-test its
   public production URL.

Vercel uses the repository's package lock, runs the Astro build, and serves the
generated `dist` directory. Keep framework defaults unless the application gains
a concrete requirement they do not support.

## Environment variables and secrets

Static builds require two server-only values:

| Variable                   | Preview scope            | Production scope            |
| -------------------------- | ------------------------ | --------------------------- |
| `SUPABASE_URL`             | Preview Supabase project | Production Supabase project |
| `SUPABASE_PUBLISHABLE_KEY` | Preview publishable key  | Production publishable key  |

The variables are configured independently in Vercel and are hidden from build
output. They intentionally omit Astro's `PUBLIC_` prefix and must not be copied
between environments. A publishable key is constrained by database grants and
Row Level Security; it is not an administrative credential.

Do not add database passwords, secret keys, service-role keys, private drafts,
or Supabase access tokens to Vercel. Local development continues to use an
ignored `.env.local` file and the local Supabase values reported by
`npm run db:status`.

Environment changes apply to new deployments. Trigger or redeploy the intended
environment after changing a value, then verify the build and reader-facing
data before promoting the change.

## Article publishing deployment hook

Because article pages are generated at build time, a successful Production
publish or archive posts to a Vercel Deploy Hook for `main`. Store that private
hook URL only in the ignored `.env.publish.production` file as
`VERCEL_DEPLOY_HOOK_URL`; it does not belong in Vercel, GitHub, CI, screenshots,
or terminal logs. Preview publishing is verified with a local build and does not
use a permanent branch deploy hook.

The publishing command requests a deployment only after a real database change.
If Supabase changes successfully but Vercel rejects the hook, use the Vercel
dashboard to redeploy the current Production commit. The database change remains
in place, so do not modify the article again solely to request another build.

## Rollback

For an urgent hosting rollback, use Vercel's Instant Rollback to restore the
last known-good production deployment. Then revert the responsible Git commit
through a pull request. After the corrective deployment is ready, use Undo
Rollback or promote it so Vercel resumes assigning production domains from
`main`. Record the failed deployment and the verification performed after
rollback.

## References

- [Deploying Git repositories with Vercel](https://vercel.com/docs/git)
- [Deployment protection](https://vercel.com/kb/guide/locking-down-deployments)
- [Performing an Instant Rollback](https://vercel.com/docs/instant-rollback)
- [Set up and use Deploy Hooks](https://vercel.com/kb/guide/set-up-and-use-deploy-hooks-with-vercel-and-headless-cms)

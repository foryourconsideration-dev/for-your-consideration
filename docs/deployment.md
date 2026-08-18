# Deployments

Vercel hosts the site and builds it directly from the GitHub repository. The
Astro application currently produces a static site in `dist`; it does not need a
Vercel adapter or repository-specific Vercel configuration.

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
3. Wait for the GitHub quality check and Vercel preview deployment to succeed.
4. Open the preview URL while logged in to Vercel and perform the applicable
   desktop, mobile, keyboard, and content checks.
5. Merge the approved pull request into `main`.
6. Confirm the resulting production deployment is ready and smoke-test its
   public production URL.

Vercel uses the repository's package lock, runs the Astro build, and serves the
generated `dist` directory. Keep framework defaults unless the application gains
a concrete requirement they do not support.

## Environment variables and secrets

No environment variables are currently required. Add future values in Vercel's
project settings and scope them deliberately to Preview or Production. Never
commit credentials or copy production-only secrets into Preview without a
documented requirement.

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

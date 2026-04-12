# wumbo-ui

`wumbo-ui` is the frontend foundation for `wumbo`.

This first pass intentionally focuses on:

- the long-term app/tooling baseline
- reusable UI primitives and Storybook
- Cognito sign-up, sign-in, callback, and sign-out

This pass intentionally does not define the final `wumbo-core` browser access pattern yet.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Storybook 9
- Radix UI primitives
- Vitest + Testing Library
- Playwright scaffold for browser smoke tests

## Current App Surface

The app currently includes:

- a simple auth landing page
- Cognito managed sign-up and sign-in entrypoints
- the OAuth callback handler
- local session cookie handling
- sign-out support

The app currently does not include:

- domain UI
- `wumbo-core` read/write screens
- a settled proxy/BFF pattern for core API access

## Environment Variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_COGNITO_DOMAIN`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_REDIRECT_URI`
- `NEXT_PUBLIC_COGNITO_LOGOUT_URI`
- `NEXT_PUBLIC_COGNITO_SCOPES`

Default local callback:

```text
http://localhost:3000/api/auth/callback
```

## Container Build

The deploy path now assumes a separate Docker image per environment.

The production container:

- builds Next.js with `output: "standalone"`
- bakes the `NEXT_PUBLIC_*` Cognito values into the image at build time
- serves the app on port `3000`
- exposes `GET /healthz` for ECS and ALB health checks

Build example:

```powershell
docker build `
  --build-arg NEXT_PUBLIC_COGNITO_DOMAIN=https://replace-me.auth.us-west-2.amazoncognito.com `
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=replace-me `
  --build-arg NEXT_PUBLIC_COGNITO_REDIRECT_URI=https://app.example.com/api/auth/callback `
  --build-arg NEXT_PUBLIC_COGNITO_LOGOUT_URI=https://app.example.com `
  --build-arg NEXT_PUBLIC_COGNITO_SCOPES="openid email profile" `
  -t wumbo-ui:local .
```

## GitHub Actions Deploys

The repo now includes:

- `.github/workflows/deploy-dev.yml`
- `.github/workflows/deploy-prod.yml`

`deploy-dev` uses the GitHub `dev` environment, `deploy-prod` uses `prod`, and both workflows are manually triggered from the GitHub Actions tab. They:

- assume an AWS role through GitHub OIDC
- read deploy metadata from SSM under `/<project>/<env>/...`
- build an environment-specific image with the Cognito `NEXT_PUBLIC_*` values
- push that image to the environment's ECR repository
- register a new ECS task definition revision
- update the existing ECS service and wait for stability

Expected GitHub Environment variables:

- `AWS_ROLE_ARN` from the matching `wumbo-infra` stack output `ui_github_actions_role_arn`
- optional `AWS_REGION` if you do not want the default `us-west-2`

## Scripts

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run storybook
```

If PowerShell blocks `npm`, use `npm.cmd`.

## Structure

```text
src/
  app/
  components/
    ui/
  features/
    auth/
  lib/
    auth/
    utils/
docs/
  FOUNDATION.md
```

## Related Repos

- `wumbo-infra` owns Cognito and AWS wiring
- `wumbo-core` owns business logic, authorization, and internal user registration

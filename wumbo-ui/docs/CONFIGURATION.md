# Configuration Strategy

`wumbo-ui` uses a split configuration model so ownership stays clear and secrets do not get baked into Docker images.

## 1. Infra-managed config

Use infra-managed values when AWS infrastructure creates or owns the value.

Examples:

- Cognito domain URL
- Cognito client IDs
- deployed app URLs created by infrastructure

Current pattern:

- `wumbo-infra` writes these values to AWS SSM Parameter Store
- the GitHub deploy workflows read them from SSM during the image build

This keeps Terraform-owned values in one source of truth instead of duplicating them in GitHub.

## 2. GitHub-managed public build-time config

Use GitHub Environment variables for app-owned values that are safe to expose in the browser and are needed at build time.

Examples:

- `NEXT_PUBLIC_UI_BUILD_LABEL`
- analytics public keys
- app-owned frontend feature flags
- UI-only external public URLs

Current pattern:

- store the value in the GitHub `dev` or `prod` environment
- pass it into `docker build` as a `--build-arg`
- read it in the app with a direct `process.env.NEXT_PUBLIC_*` reference

Do not use dynamic env access like `process.env[name]` for these values in Next.js when you expect them to be baked into the build.

## 3. Runtime secrets

Do not bake runtime secrets into the image.

Examples:

- API keys
- private integration tokens
- database credentials
- anything that must stay server-only

Preferred pattern:

- store secrets in AWS Secrets Manager
- inject them into the ECS task at runtime

If we have sensitive but non-secret runtime config later, ECS runtime env vars or encrypted SSM parameters can also be used depending on the case.

## Rule of thumb

- If infra owns it, prefer SSM from `wumbo-infra`.
- If `wumbo-ui` owns it and it is browser-safe, prefer GitHub Environment vars plus `NEXT_PUBLIC_*`.
- If it is secret, prefer runtime injection from Secrets Manager and keep it out of the image.

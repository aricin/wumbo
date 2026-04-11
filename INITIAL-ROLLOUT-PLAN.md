# Wumbo Initial Rollout Plan

This is the first end-to-end path from empty AWS accounts to a testable `wumbo-core` deployment.

The goal is not to finish every repo. The goal is to get the minimum viable foundation deployed in `dev`, prove the shape, and only then mirror the pattern to `prod`.

## Phase 0: Local Machine Prerequisites

Install and verify:

- Git
- Node.js and npm
- Docker Desktop
- AWS CLI
- Session Manager plugin
- Terraform
- SAM CLI

Configure once:

- `git config --global user.name "..."`
- `git config --global user.email "..."`
- `git config --global core.autocrlf false`
- AWS CLI credentials for your management account

Done when:

- `aws sts get-caller-identity` works
- `terraform version` works
- `sam --version` works
- Docker is running

## Phase 1: AWS Account Setup

Manually create or confirm:

- `wumbo-dev`
- `wumbo-prod`

Place them in the right OUs in your personal organization.

Verify:

- you can assume into each account
- `OrganizationAccountAccessRole` exists or you have an equivalent deploy role
- you know the account IDs for both

Choose and lock down:

- primary AWS region for `wumbo`
- account email naming
- whether you want `dev` and `prod` to share the same region

Done when:

- both account IDs are known
- local AWS access into both accounts is working

## Phase 2: Repo Setup

Push the repos you want to start with:

- `wumbo-infra`
- `wumbo-core`

You can leave the others empty or private placeholders for now.

Recommended first GitHub state:

- default branch set
- branch protection optional for now
- README present

Done when:

- both repos are on GitHub
- your local clones are clean and current

## Phase 3: Terraform Backend And AWS Profiles

Make sure the remote Terraform backend already exists in whatever shared/personal infra location you want to use.

Then prepare:

- backend config files for `wumbo-infra/stacks/dev`
- backend config files for `wumbo-infra/stacks/prod`
- local AWS profiles or role assumption flow for deploying into the workload accounts

Done when:

- `terraform init -backend-config=backend.hcl` can succeed in `wumbo-infra/stacks/dev`

## Phase 4: Deploy `wumbo-infra` Dev

Apply `dev` first only.

Current scope in `wumbo-infra`:

- VPC
- private subnets
- public subnet for SSM jump host
- RDS PostgreSQL
- Cognito user pool
- Cognito app clients for `ui` and `admin`
- SSM jump host
- SSM parameters for DB and Cognito config

Concrete steps:

1. Fill in [stacks/dev/backend.hcl.example](C:\Users\adrot\Projects\wumbo\wumbo-infra\stacks\dev\backend.hcl.example)
2. Copy it to `backend.hcl`
3. Fill in [stacks/dev/terraform.tfvars.example](C:\Users\adrot\Projects\wumbo\wumbo-infra\stacks\dev\terraform.tfvars.example)
4. Copy it to `terraform.tfvars`
5. Run `terraform init -backend-config=backend.hcl`
6. Run `terraform plan`
7. Run `terraform apply`

Capture these outputs:

- VPC ID
- private subnet IDs
- DB address
- DB port
- DB name
- DB secret ARN
- Cognito issuer URL
- Cognito UI client ID
- Cognito admin client ID
- Cognito JWT audiences
- jump host instance ID

Done when:

- dev infra apply completes successfully
- the DB exists
- the jump host exists
- Cognito exists

## Phase 5: Verify Dev Infrastructure

Validate the pieces before touching `wumbo-core`.

Checks:

- start an SSM tunnel to the DB using the jump host
- confirm you can connect to the dev DB from your laptop
- inspect SSM parameters under:
  - `/<project>/<env>/database/primary/*`
  - `/<project>/<env>/auth/cognito/*`
- create one test user in Cognito

Recommended first Cognito test users:

- one customer user
- one admin user

Done when:

- DB tunnel works
- you can authenticate or at least create test users in the user pool

## Phase 6: Fill The Remaining Infra Gaps For `wumbo-core`

Before `wumbo-core` can run privately in the VPC without NAT, you still need a few shared primitives in `wumbo-infra`.

Add next:

- EventBridge bus for `wumbo`
- Secrets Manager VPC endpoint
- EventBridge VPC endpoint

Maybe later:

- Systems Manager VPC endpoint if `wumbo-core` starts reading SSM at runtime
- tighter DB security group rules that reference specific app security groups instead of broad VPC CIDR

Done when:

- `wumbo-core` has everything it needs to read its DB secret and publish events without NAT

## Phase 7: Local `wumbo-core` Test

Test locally before the first AWS deploy.

Setup:

1. Install dependencies in `wumbo-core`
2. Start a local Postgres container
3. Copy [.env.example](C:\Users\adrot\Projects\wumbo\wumbo-core\.env.example) to `.env`
4. Point `.env` at local Postgres
5. Run `npm run db:migrate`
6. Run `npm run typecheck`
7. Run `sam local start-api`

Initial local tests:

- `GET /health`
- `POST /v1/example-items` with `x-dev-user-id`
- verify rows land in `example_items`
- verify rows land in `outbox_events`

Done when:

- the placeholder write flow works end to end locally

## Phase 8: Dev Database Migration Against AWS

Once local looks good, point the migration runner at the real dev database.

Recommended flow:

1. Start the SSM tunnel
2. Set local env vars so `wumbo-core` connects through `127.0.0.1:15432`
3. Pull the DB password from Secrets Manager
4. Run `npm run db:migrate`

Done when:

- the dev RDS instance has the core schema
- `schema_migrations`, `example_items`, and `outbox_events` exist

## Phase 9: First Dev Deploy Of `wumbo-core`

Deploy only after infra and local testing are good.

Inputs needed from `wumbo-infra`:

- VPC ID
- private subnet IDs
- DB host
- DB port
- DB name
- DB username
- DB secret ARN
- Cognito issuer
- Cognito audiences
- Event bus name

Deploy tasks:

1. create a `samconfig` or equivalent deploy parameter file
2. run `sam build`
3. run `sam deploy` into `wumbo-dev`
4. capture the HTTP API URL

Done when:

- the stack deploys
- the API URL is live

## Phase 10: End-To-End Dev Smoke Test

This is the first real proof that the architecture works.

Smoke test list:

- `GET /health`
- `GET /health?check=db`
- create a Cognito-authenticated request to `POST /v1/example-items`
- confirm row in `example_items`
- confirm outbox row exists
- invoke the publisher
- confirm event lands on the EventBridge bus

Done when:

- request path, DB path, and event path all work in `dev`

## Phase 11: Tighten What We Learned From Dev

After the first successful dev test, pause and harden the rough edges.

Likely follow-ups:

- tighten DB security group rules
- decide whether to keep the dev header auth bridge
- add budgets or basic alarms
- decide whether Cognito self-signup should remain enabled
- decide whether to keep direct Lambda-to-RDS or add RDS Proxy later

Done when:

- the biggest surprises from dev are resolved

## Phase 12: Mirror To Prod

Only after `dev` feels boring.

Sequence:

1. apply `wumbo-infra/stacks/prod`
2. verify DB, Cognito, and jump host
3. run migrations against prod carefully
4. deploy `wumbo-core` to prod
5. run smoke tests

Prod should stay minimal, but not careless:

- keep deletion protection on
- keep final snapshot behavior on
- create admin users deliberately
- avoid test-only auth shortcuts

Done when:

- prod is live with the same proven shape as dev

## What We Can Skip For Now

Do not block on these before the first dev proof:

- NAT gateway
- RDS Proxy
- Cognito hosted UI domain
- custom Cognito email/SMS setup
- full `wumbo-events` implementation
- Stripe / `wumbo-billing`
- UI hosting
- advanced observability platform work

## Immediate Next Steps

If we were continuing right now, the shortest path would be:

1. Apply `wumbo-infra` dev
2. Add the missing EventBridge and VPC endpoint pieces
3. Install `wumbo-core` dependencies
4. Run local `wumbo-core` tests
5. Migrate the dev DB
6. Deploy `wumbo-core` to dev
7. Smoke test the full path

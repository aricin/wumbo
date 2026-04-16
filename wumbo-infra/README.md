# wumbo-infra

Terraform for infrastructure that lives inside the pre-existing `wumbo-dev` and `wumbo-prod` AWS accounts.

This repo now assumes:

- the AWS accounts already exist
- your personal org and shared Terraform backend live somewhere else
- `wumbo-infra` should focus on app infrastructure, not organization management

See [docs/RESOURCE_NAMING.md](/C:/Users/adrot/Projects/wumbo/wumbo-infra/docs/RESOURCE_NAMING.md) for the naming policy used across shared environment resources, workload-shared resources, and service-owned resources.
See [docs/POSTGRES_PROVISIONING.md](/C:/Users/adrot/Projects/wumbo/wumbo-infra/docs/POSTGRES_PROVISIONING.md) for the shared Postgres provisioning model used for service-owned logical databases.

## Layout

```text
modules/
  cognito/
  ecs-ui/
  eventbridge/
  network/
  observability/
  rds-postgres/
  ssm-jump-host/
scripts/
  postgres/

stacks/
  marketplace/
    dev/
    prod/
  intelligence/
    dev/
    prod/
```

## Mental Model

`modules/network`

- creates a lean VPC with isolated private subnets and an optional small public edge
- can optionally add a single NAT gateway for private subnet HTTPS egress
- meant to keep early network costs low while still giving RDS the VPC shape it requires

`modules/eventbridge`

- creates a custom EventBridge bus for internal domain events
- writes the bus name and ARN to SSM so app and consumer repos can discover them
- gives `wumbo-core` a stable target for transactional outbox publishing
- uses workload-scoped naming, such as `wumbo-marketplace-dev-domain-events`

`modules/rds-postgres`

- creates a standard RDS PostgreSQL instance, not Aurora
- creates a DB subnet group, security group, parameter group, KMS key, and secret
- stores the master password in Secrets Manager
- exports PostgreSQL logs to CloudWatch and keeps them for 30 days by default
- enables slow-query logging with a `1000ms` threshold by default
- writes shared datastore metadata to SSM under the workload namespace
- keeps the DB password out of Terraform state by using Terraform write-only arguments
- intentionally stops at the shared RDS instance boundary; service-owned logical databases are provisioned separately after `terraform apply`

`modules/observability`

- creates shared SNS topics for `standard` and `critical` alerts
- can subscribe email endpoints to both topics
- adds a small first-pass RDS alarm set
- creates a CloudWatch dashboard that covers critical core Lambdas, RDS, EventBridge `PutEvents`, and the deployed UI service
- uses workload-scoped alerting names, such as `wumbo-marketplace-dev-alerts-standard`

`modules/ssm-jump-host`

- creates a tiny no-ingress EC2 instance for Session Manager-based access to private services
- gives that instance outbound internet through a public subnet so SSM works without NAT or PrivateLink
- keeps the database private while still giving you an operator access path
- uses workload-scoped naming, such as `wumbo-marketplace-dev-jump`

`modules/cognito`

- creates a lean Cognito user pool and separate app clients for `wumbo-ui` and `wumbo-admin`
- can optionally create a hosted-login domain and OAuth redirect config for `wumbo-ui`
- writes stable identity config into SSM so `wumbo-core` and the UI repos can consume it later
- uses service-scoped naming for identity-owned resources, such as `wumbo-identity-dev`

`modules/ecs-ui`

- creates the ECR, ECS, ALB, IAM, log group, and SSM parameter baseline for the deployed `wumbo-ui` app
- owns the GitHub Actions deploy role for `wumbo-ui` when a GitHub repository is configured
- runs the UI tasks in private subnets behind a public ALB
- supports rolling deployments with the ECS deployment circuit breaker enabled
- can optionally create ACM + Route53 HTTPS wiring for the app domain
- keeps app resources service-scoped while allowing the shared ECS cluster to be workload-scoped
- intentionally bootstraps the ECS service at `0` desired tasks until the first real image is deployed from GitHub Actions

`stacks/marketplace/dev` and `stacks/marketplace/prod`

- are the runnable Terraform roots
- assume into the target account using `OrganizationAccountAccessRole`
- compose the network, database, and jump-host modules with environment-specific settings

`stacks/intelligence`

- reserves space for future analytics, data processing, and ML roots
- is intentionally placeholder-only until that workload has real infrastructure to own

## Why This Shape

- `wumbo-infra` is now scoped to the `wumbo` accounts only
- each environment has its own root module and its own state file
- the expensive part here is the database, not the VPC itself
- the VPC is intentionally minimal so you can add NAT or VPC endpoints later only when compute actually needs them

## Current Foundation

Each marketplace environment stack currently creates:

- one VPC
- two isolated private subnets across two AZs
- two public subnets for the internet-facing ALB and the no-ingress jump host
- one optional single NAT gateway for private subnet outbound HTTPS
- one standard RDS PostgreSQL instance
- no extra workload-level application database inside that instance
- one Cognito user pool
- two Cognito app clients
- one `wumbo-ui` ECR repository
- one workload-shared ECS cluster for marketplace app services
- one ECS/Fargate service baseline for `wumbo-ui`
- one public Application Load Balancer for `wumbo-ui`
- one custom EventBridge domain bus
- two shared alert SNS topics
- one shared CloudWatch operations dashboard
- one optional hosted-login domain for `wumbo-ui`
- one KMS key for database storage and secrets
- one Secrets Manager secret for the master password
- one SSM jump host EC2 instance
- SSM parameters under `/<project>/<workload>/<environment>/databases/marketplace/*` that describe the shared marketplace datastore namespace
- marketplace Postgres identifiers and outputs use workload-specific names such as `wumbo-marketplace-dev-postgres`
- SSM parameters under `/<project>/identity/<environment>/cognito/*`
- SSM parameters under `/<project>/ui/<environment>/app/*`
- EventBridge, observability, jump-host, and the shared ECS cluster use workload-scoped marketplace naming
- Cognito uses identity service naming

## Apply Order

Start with `dev`, then mirror to `prod` once you like the shape.

1. `stacks/marketplace/dev`
2. `stacks/marketplace/prod`

## Quick Start

This repo expects a remote backend to already exist, often in a separate personal/shared infra repo.

Use Terraform `1.11+` because the database module relies on write-only arguments for secrets.
For the local DB tunnel flow and manual Postgres provisioning, install the AWS
CLI, the Session Manager plugin, and `psql` on your machine.

### 1. Configure the dev stack

```powershell
cd stacks/marketplace/dev
Copy-Item backend.hcl.example backend.hcl
Copy-Item terraform.tfvars.example terraform.tfvars
```

Fill in:

- the shared backend bucket and lock table
- the real `target_account_id`
- any DB sizing changes you want
- whether you want the single NAT gateway enabled for private Lambda egress
- email addresses to subscribe to shared alerts if you want notifications
- a unique `cognito_ui_domain_prefix` if you want hosted login for `wumbo-ui`
- local callback/logout URLs for the UI if you are still smoke testing on localhost
- `ui_github_repository` in `owner/repo` form if you want the stack to create the GitHub Actions deploy role
- optional `ui_domain_name` plus `ui_route53_zone_id` if you want deployed HTTPS for `wumbo-ui`

Then run:

```powershell
terraform init -backend-config=backend.hcl
terraform apply
```

After the shared infrastructure is applied, start the DB tunnel and run the
logical database provisioner before deploying service repos. See
[docs/POSTGRES_PROVISIONING.md](/C:/Users/adrot/Projects/wumbo/wumbo-infra/docs/POSTGRES_PROVISIONING.md).

### 2. Configure the prod stack

Repeat the same process in `stacks/marketplace/prod`.

## Developer DB Access

This repo now includes a simple SSM jump-host pattern:

- the database stays private in private subnets
- the jump host has no inbound rules
- the jump host sits in a public subnet only so it can reach AWS Systems Manager without NAT
- the stack expects at least one public subnet whenever the jump host is enabled

After apply, start a local port-forwarding session with the jump-host instance ID output from the stack:

```powershell
aws ssm start-session `
  --target i-0123456789abcdef0 `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host=["your-rds-endpoint.us-east-1.rds.amazonaws.com"],portNumber=["5432"],localPortNumber=["15432"]
```

Then connect locally to `127.0.0.1:15432`.

The shared Postgres provisioner also expects this local tunnel to already be
running.

From [wumbo-infra](/C:/Users/adrot/Projects/wumbo/wumbo-infra), run:

```bash
bash ./scripts/postgres/provision-service-databases.sh --environment dev --region us-west-2
```

## Cognito Hosted Login For wumbo-ui

The Cognito module now supports a first-pass browser login flow for `wumbo-ui`.

Set these values in the stack `terraform.tfvars` when you want that enabled:

- `cognito_ui_domain_prefix`
- `cognito_ui_callback_urls`
- `cognito_ui_logout_urls`

For local smoke testing, a good dev starting point is:

```hcl
cognito_ui_domain_prefix = "wumbo-identity-dev-auth"
cognito_ui_callback_urls = ["http://localhost:3000/api/auth/callback"]
cognito_ui_logout_urls   = ["http://localhost:3000"]
```

For deployed browser auth, the callback and logout URLs must be `HTTPS`.

If you also set:

- `ui_domain_name`
- `ui_route53_zone_id`

then the stack can provision the `wumbo-ui` HTTPS endpoint and automatically
point Cognito callback/logout URLs at:

- `https://<ui_domain_name>/api/auth/callback`
- `https://<ui_domain_name>`

After apply, use these outputs to populate `wumbo-ui/.env.local`:

- `cognito_ui_client_id`
- `cognito_ui_domain_url`
- `cognito_ui_callback_urls`
- `cognito_ui_logout_urls`
- `cognito_issuer_url`

## Cognito PostConfirmation Trigger For Identity

The Cognito module can now optionally attach a PostConfirmation trigger to the
identity-owned user pool.

Use this flow:

1. deploy the service that owns the Cognito trigger code, such as `wumbo-identity`
2. copy the trigger Lambda ARN from that service stack
3. set `cognito_post_confirmation_lambda_arn` in the matching Terraform stack
4. run `terraform apply`

Example for `dev`:

```hcl
cognito_post_confirmation_lambda_arn = "arn:aws:lambda:us-west-2:222222222222:function:wumbo-identity-dev-post-confirmation"
```

Terraform will:

- attach the Lambda as the user pool PostConfirmation trigger
- grant Cognito permission to invoke it

## Domain Event Bus For wumbo-core

Each environment stack now creates a custom EventBridge bus named
`${project}-${workload}-${environment}-domain-events`, such as `wumbo-marketplace-dev-domain-events`.

Use these outputs when wiring `wumbo-core`:

- `event_bus_name`
- `event_bus_arn`

The bus metadata is also written to SSM under:

- `/<project>/<workload>/<environment>/events/domain/bus-name`
- `/<project>/<workload>/<environment>/events/domain/bus-arn`

## Observability Baseline

Each environment stack now also creates:

- `${project}-${workload}-${environment}-alerts-standard`
- `${project}-${workload}-${environment}-alerts-critical`
- a CloudWatch dashboard named `${project}-${workload}-${environment}-operations`
- first-pass UI alarms for ECS CPU/memory, ALB target latency, unhealthy hosts, and repeated target `5xx`

Both SNS topics can subscribe the same set of email addresses through:

```hcl
alert_email_addresses = ["you@example.com"]
```

The email subscriptions require confirmation after `terraform apply`.

The database baseline also now includes:

- PostgreSQL log export to CloudWatch Logs
- `30` day retention on exported DB log groups
- slow-query logging with `log_min_duration_statement = 1000`
- first-pass RDS alarms for CPU, connections, freeable memory, and low free storage

The UI baseline also now includes:

- a dedicated CloudWatch Logs group for the ECS app container
- ALB request/error/latency widgets on the shared operations dashboard
- ECS CPU/memory widgets on the shared operations dashboard
- SSM parameters under `/<project>/ui/<environment>/app/*` for the deploy workflow
- a stack-local GitHub OIDC provider plus an optional `wumbo-ui` deploy role output when `ui_github_repository` is set

## NAT-backed Lambda Egress For wumbo-core

The network module can now optionally create a single NAT gateway in the first
public subnet and route the private subnets through it.

Use this when `wumbo-core` Lambdas need:

- runtime access to AWS public service endpoints such as Secrets Manager
- outbound HTTPS access to third-party APIs such as geocoding providers

Set this in the stack `terraform.tfvars`:

```hcl
nat_gateway_enabled = true
```

After apply, `wumbo-core` can continue to run inside private subnets while
using NAT-backed outbound HTTPS.

If `wumbo-core` reads the DB password from Secrets Manager at runtime, also copy
the `marketplace_postgres_kms_key_arn` output into the SAM deploy parameters so
the Lambda role can decrypt the service-owned DB secret with least privilege.

## Shared Postgres And Service Databases

Marketplace now uses:

- one shared Postgres instance owned by `wumbo-infra`
- one logical Postgres database per relational service
- one service-owned credential per service database

In this model:

- the shared workload metadata stays under `/<project>/<workload>/<environment>/databases/marketplace/*`
- service-owned relational metadata lives under `/<project>/<service>/<environment>/databases/<service>/*`
- the master user is only for platform provisioning
- application services use only their own DB user

The initial logical databases provisioned in this repo are:

- `core`
- `identity`

`wumbo-core` should now be wired to the `core` database and the `core`
credential, not the shared master credential.

This shared-instance model is the current default because it keeps relational
compute shared while load is still inconsistent. When a service needs
independent scaling, stronger isolation, or a different availability/restore
posture, it can move to its own DB instance later.

The domain prefix must be unique within the AWS region. Start with a neutral value such as `wumbo-identity-dev-auth`, and if that is already taken, append a non-personal suffix such as a team or account alias.

## Notes

- The NAT gateway is optional, but once enabled it becomes a meaningful fixed monthly network cost.
- The jump host has no inbound SSH access. Its public subnet exists only to give the instance outbound internet for Systems Manager.
- The current NAT shape is intentionally a single-AZ cost-optimized baseline, not a fully multi-AZ egress design.
- The default dev example is intentionally cheaper and more disposable.
- The default prod example stays minimal on compute and availability, while still keeping deletion protection and a final snapshot requirement.
- This repo uses standard RDS PostgreSQL because it is the simpler and usually cheaper starting point. You can move to Aurora later if availability or scaling requirements justify it.

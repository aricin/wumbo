# wumbo-core

`wumbo-core` is the main backend API for `wumbo`.

It owns:

- the HTTP API
- business logic and authorization rules
- the application database schema and migrations
- data access patterns
- domain event creation and outbox persistence

It does not own:

- AWS account/bootstrap infrastructure
- identity-provider lifecycle hooks
- UI applications
- Stripe-specific infrastructure

See also:

- [docs/ARCHITECTURE.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\ARCHITECTURE.md)
- [docs/TESTING.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\TESTING.md)
- [docs/REFACTOR-PLAN.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\REFACTOR-PLAN.md)

## Core Patterns

This repo follows a hexagonal architecture shape:

- `entrypoints`: inbound adapters such as API Gateway handlers, queue consumers, and scheduled jobs
- `domain`: business logic, entities, use-cases, policies, and ports
- `adapters`: implementations for the database and external systems
- `shared`: lightweight config and HTTP utilities used across the app

That split matters because `wumbo-core` has real domain complexity:

- ownership and authorization rules
- multiple entrypoints that need to share the same business logic
- a need for fast tests that do not require Lambda, Cognito, or Postgres running

This pattern is a conscious tradeoff, not a default rule for every service in the platform.

### Why This Fits `wumbo-core`

We use ports and adapters here because `wumbo-core` is the marketplace domain service.
It owns the rules that actually need protecting and reuse:

- public API behavior
- future admin/API clients
- async consumers that still need to enforce domain rules
- transactional writes plus outbox publication

Keeping those rules in `domain/` lets different entrypoints call the same use-cases and
policy functions without re-implementing them at the edges.

### When Not To Reach For This Pattern

Ports/adapters and DDD-style layering add cost:

- more files and interfaces
- more indirection when reading the code
- more maintenance when the workflow is simple

We do not treat hexagonal architecture as a one-size-fits-all standard. For a thin service
that mostly translates one external event into one database write or one downstream call, a
flatter application structure is often the better choice.

### Auth vs Authorization

Authentication and authorization are intentionally separate:

- Cognito handles sign-in and JWT issuance
- Cognito confirmation flows create identities
- API Gateway validates JWTs
- `wumbo-core` turns claims into an internal actor/context
- domain policy functions decide what that actor can do

So auth answers "who is this?" and domain policies answer "are they allowed to do this?"

### Commands vs Queries

Reads and writes are kept distinct:

- commands change state
- queries return data without changing state

That does not require separate databases. It just keeps use cases clearer and easier to test.

### App Users vs Cognito Users

Cognito is not the application database.

We still keep an internal `users` table so the domain has:

- a stable internal user id
- a foreign-key target for other tables
- freedom to evolve without coupling everything to Cognito attributes

The link is `users.cognito_subject -> Cognito sub`.

The normal user-registration path is:

1. Cognito signup and confirmation
2. `wumbo-identity` `PostConfirmation` trigger
3. `identity.user.registered.v1` on the shared domain bus
4. `registerUserFromIdentity` in `wumbo-core`
5. internal `users` row creation plus `user-registered.v1`

### Public vs Private Profile Data

Profile data is split into:

- `public_profiles`
- `private_profiles`

That keeps access rules explicit and reduces the chance of accidentally exposing private fields in a public read path.

### Transactional Outbox

Writes that need to emit events also write an outbox row in the same transaction. A scheduled publisher Lambda then sends those rows to the custom domain EventBridge bus later.

That gives us a reliable event flow without coupling request success to a best-effort network call.

## Current Reference Slice

The current realistic example domain is:

- `users`
- `public_profiles`
- `private_profiles`
- `properties`
- `outbox_events`

Current event contracts use this shape:

- `source`: producer identity, such as `wumbo.core`
- `detail-type`: versioned contract name, such as `user-registered.v1`
- `detail`: domain-event envelope with `eventId`, `aggregateType`, `aggregateId`, `occurredAt`, and `data`

The current API surface is:

- `GET /health`
- `GET /profiles/{handle}`
- `GET /properties/{slug}`
- `GET /v1/me`
- `GET /v1/me/profile`
- `PATCH /v1/me/public-profile`
- `PATCH /v1/me/private-profile`
- `POST /v1/properties`
- `PATCH /v1/properties/{propertyId}`

Auth expectations:

- `/health`, public profile reads, and public property reads are public
- `/v1/*` routes are authenticated
- in non-prod, there is still a temporary `x-dev-user-id` bridge for local smoke testing when JWT auth is not wired

## Project Layout

```text
src/
  adapters/
    db/
      client/
      migrations/
      repositories/
      schema/
    eventbridge/
  domain/
    entities/
    events/
    errors/
    policies/
    ports/
    use-cases/
  entrypoints/
    api/
      auth/
      handlers/
      dto/
    events/
    jobs/
  shared/
    config/
    http/
```

High-level responsibilities:

- `src/entrypoints/api`: Lambda handlers, request translation, auth-context translation
- `src/entrypoints/events`: async consumers such as the identity registration queue handler
- `src/entrypoints/jobs`: scheduled/background entrypoints
- `src/domain`: business rules and use-case orchestration
- `src/adapters/db`: Drizzle schema, migrations, repositories, and the concrete `UnitOfWork`
- `src/adapters/eventbridge`: outbound event publishing
- `src/shared`: shared config and response helpers

Current persistence ports:

- `UsersRepository`
- `PublicProfilesRepository`
- `PrivateProfilesRepository`
- `PropertiesRepository`
- `EventOutbox`
- `UnitOfWork`

Current user lifecycle path:

- Cognito owns signup, password, and confirmation emails
- `wumbo-core` owns the internal app user record
- `registerUserFromIdentity` creates or updates the internal user from an identity event
- `wumbo-core` now consumes `identity.user.registered.v1` asynchronously instead of being invoked directly by Cognito

## Getting Set Up

### Prerequisites

- Node.js 22+
- npm
- AWS SAM CLI
- Docker, if you want to use `sam local`
- access to the `marketplace/dev` database and `identity/dev` Cognito resources from `wumbo-infra`

If you are working against the shared dev database, first follow the `wumbo-infra` setup so:

- `marketplace/dev` infrastructure is applied
- the SSM jump host works
- the private subnets have NAT-backed outbound HTTPS if deployed Lambdas need AWS public APIs or third-party services
- you can tunnel to the RDS instance locally

### Install Dependencies

```bash
npm install
```

If PowerShell blocks `npm`, use `npm.cmd`.

### Connect to the Dev Database

The simplest current path is:

1. start the SSM tunnel from the `wumbo-infra` workflow
2. point local DB access at `127.0.0.1:15432`
3. use the `core` service credential from Secrets Manager after running the shared Postgres provisioner

The migration tooling reads either `DATABASE_URL` or the individual `DB_*` variables.

Example `.env` for the dev tunnel:

```env
APP_ENV=dev
SERVICE_NAME=wumbo-core
DB_HOST=127.0.0.1
DB_PORT=15432
DB_NAME=core
DB_USER=core
DB_PASSWORD=replace-me
DB_SSL_ENABLED=true
ALLOW_DEV_IDENTITY_HEADER=true
EVENT_BUS_NAME=
PUBLISHER_BATCH_SIZE=10
```

You can also use:

```env
DATABASE_URL=postgresql://core:replace-me@127.0.0.1:15432/core?sslmode=require
```

### Sanity Check the Codebase

```bash
npm run typecheck
npm run test:domain
sam validate --template template.yaml --region us-west-2
```

Current test commands:

- `npm run test`: run all test files in the repo
- `npm run test:domain`: run the fast domain suite only
- `npm run test:api`: run API boundary tests
- `npm run test:db`: run DB adapter integration tests against `TEST_DATABASE_URL`

Current local verification status:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `sam.cmd validate --template template.yaml --region us-west-2`

### Generate and Apply Migrations

Generate SQL from the current schema:

```bash
npm run db:generate
```

Apply migrations to the current database target:

```bash
npm run db:migrate
```

The generated migration files live under [src/adapters/db/migrations](C:\Users\adrot\Projects\wumbo\wumbo-core\src\adapters\db\migrations).

### Run Locally

For local Lambda/API simulation:

```bash
npm run local:api
```

This is most useful once you have the needed template parameters available from `wumbo-infra`, such as:

- VPC/subnet values
- `core` DB host/name/user/secret from `/wumbo/core/<env>/databases/core/*`
- Cognito issuer and audiences

In practice, the current fastest feedback loop is:

1. typecheck locally
2. run migrations against the dev DB tunnel
3. deploy `wumbo-core-dev` against the applied `marketplace/dev` infrastructure
4. smoke test with `wumbo-ui` + Cognito

### Deploy Parameter Notes

The deployed Lambdas run inside private subnets. If `wumbo-infra` enables the
single NAT gateway, `wumbo-core` can use outbound HTTPS for both:

- AWS public service endpoints such as Secrets Manager
- third-party APIs such as geocoding providers

When you deploy `wumbo-core`, also pass the database KMS key ARN from the
`wumbo-infra` stack output `marketplace_postgres_kms_key_arn` into the SAM
parameter `DatabaseSecretKmsKeyArn`. That lets the Lambda role decrypt the
service-owned `core` DB secret with least privilege.

The `DatabaseSecretArn` deploy parameter should come from the service-owned SSM
path `/wumbo/core/<env>/databases/core/secret-arn` after the shared Postgres
provisioner has run.

The EventBridge publisher also expects the custom domain bus name from the
`wumbo-infra` stack output `event_bus_name`. In `dev`, that bus name resolves
to `wumbo-marketplace-dev-domain-events`.

This stack now also enables:

- JSON Lambda logs through `LoggingConfig`
- a shared Lambda service log group with `30` day retention
- first-pass CloudWatch alarms for the identity-registration consumer and `PublishOutbox`

Those alarms assume the shared infra topics exist in the same account and
region and are passed into the SAM deploy as topic ARNs. In the current
`marketplace/dev` setup, those resolve to:

- `arn:aws:sns:us-west-2:<account-id>:wumbo-marketplace-<env>-alerts-standard`
- `arn:aws:sns:us-west-2:<account-id>:wumbo-marketplace-<env>-alerts-critical`

## Current Tooling

- `drizzle-orm` for typed database access
- `drizzle-kit` for migration generation
- `pg` as the underlying Postgres client
- `SAM` for Lambda/API packaging

Key entry files:

- [template.yaml](C:\Users\adrot\Projects\wumbo\wumbo-core\template.yaml)
- [package.json](C:\Users\adrot\Projects\wumbo\wumbo-core\package.json)
- [drizzle.config.mjs](C:\Users\adrot\Projects\wumbo\wumbo-core\drizzle.config.mjs)
- [src/adapters/db/migrate.ts](C:\Users\adrot\Projects\wumbo\wumbo-core\src\adapters\db\migrate.ts)

## Docs Status

The supporting docs are current with the codebase:

- [docs/ARCHITECTURE.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\ARCHITECTURE.md) reflects the current hexagonal layout and the `users / profiles / properties` model
- [docs/TESTING.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\TESTING.md) reflects the current testing layers, permission matrix, and async consumer coverage

The next big gap is implementation, not documentation:

- seed data
- EventBridge publisher behavior
- deploy/test loops against `wumbo-core-dev` in `marketplace/dev`

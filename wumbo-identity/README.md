# wumbo-identity

Standalone identity service for Wumbo.

This service now owns:

- the Cognito user pool and hosted login configuration
- Cognito trigger Lambdas such as `PostConfirmation`
- the canonical `identity_user_id` for each confirmed user
- identity domain events published onto the shared marketplace EventBridge bus

`wumbo-core` no longer sits directly on the Cognito trigger path. Instead,
identity writes its local user plus an outbox record in one transaction, then
publishes `identity.user.registered.v1` asynchronously for downstream services
to consume.

## Current Responsibilities

- create or update canonical identity users from Cognito `PostConfirmation`
- publish identity outbox records to the shared EventBridge bus
- expose Cognito issuer/client/domain metadata through SSM under
  `/wumbo/identity/<env>/cognito/*`

## Code Structure

`wumbo-identity` intentionally keeps the code organized around the service's
current responsibilities instead of using a heavier domain/ports layering.

- `src/users`: Cognito-facing user registration handling plus the
  `identity.user.registered.v1` event builder
- `src/outbox`: scheduled outbox publishing and the core publish workflow
- `src/db`: concrete Drizzle/Postgres code
- `src/shared`: small shared helpers such as runtime config and domain-event
  types

That keeps the service easy to read while it is still mostly trigger/input
translation plus persistence and event publication. If identity grows into
heavier business rules later, we can add more structure when the service
actually earns it.

## Data Model

The service uses the shared marketplace Postgres instance, but owns its own
logical `identity` database and credential. The primary table is:

- `users`
  - `id` is the identity-owned UUID
  - `cognito_subject` is the stable mapping back to Cognito
  - `email` and `email_verified` mirror the confirmed identity state we care
    about for downstream projections

The service also uses the shared transactional outbox pattern in
`outbox_events`.

## Deploy Order

Use this order for a fresh environment:

1. apply `wumbo-infra`
2. run the shared Postgres provisioner so the `identity` logical DB exists
3. migrate and deploy `wumbo-identity`
4. deploy `wumbo-core`
5. deploy `wumbo-ui`

## Environment Inputs

The SAM stack expects:

- shared VPC and private subnet IDs from `wumbo-infra`
- identity database connection metadata from
  `/wumbo/identity/<env>/databases/identity/*`
- shared EventBridge bus name from
  `/wumbo/marketplace/<env>/events/domain/bus-name`
- optional shared alert topic ARNs from the marketplace workload

## Notes

- Managed login stays enabled for this first pass.
- No custom signup persona or token-claim work is included yet.
- `wumbo-core` remains responsible for marketplace-domain authorization and its
  own local user projection.

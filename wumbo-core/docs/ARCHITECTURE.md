# wumbo-core Architecture

This document defines the target reference architecture for `wumbo-core`.

For the concrete incremental cleanup sequence from the current codebase to the simplified structure we want, see [docs/REFACTOR-PLAN.md](C:\Users\adrot\Projects\wumbo\wumbo-core\docs\REFACTOR-PLAN.md).

The goal is to keep:

- business logic independent from AWS and database implementation details
- authentication and authorization explicit
- reads and writes easy to reason about
- testing possible without invoking cloud resources

## Design Pattern

`wumbo-core` follows a hexagonal architecture shape aligned with AWS guidance:

- `entrypoints`: inbound adapters that start work
- `domain`: business logic and interfaces
- `adapters`: outbound implementations for persistence and external systems

For this TypeScript codebase, we keep the top-level code under `src/` instead of `app/`, but the meaning is the same.

This is an intentional choice for `wumbo-core`, not a blanket rule for every Wumbo service.

### Why We Use It In `wumbo-core`

`wumbo-core` owns the marketplace domain and has business rules worth isolating:

- ownership and authorization policies
- state-changing workflows that must stay consistent across entrypoints
- async consumers that still need to reuse the same rules as HTTP handlers
- transactional writes that also create outbox events

The main benefit is not architectural purity. The benefit is that we can keep the
domain logic testable and reusable without pulling API Gateway, Lambda, Cognito,
Postgres, or EventBridge into every test.

### Why We Do Not Treat It As A Default

Hexagonal architecture adds real cost:

- more interfaces and adapter plumbing
- more indirection when tracing a request
- more ceremony for straightforward CRUD or integration-only workflows

We only want that cost when the service has enough domain complexity to earn it.
For a simpler service that mainly translates external inputs into persistence or
downstream events, a flatter application structure is usually easier to maintain.

## Target Structure

```text
src/
  adapters/
    db/
      repositories/
      schema/
      migrations/
      unit-of-work.ts
    eventbridge/

  entrypoints/
    api/
      auth/
      handlers/
      dto/
    events/
    jobs/

  domain/
    entities/
    events/
    errors/
    policies/
    ports/
    use-cases/

  shared/
    config/
    http/
```

## Directory Responsibilities

`src/entrypoints/api`

- Lambda handlers for API Gateway routes
- request/response DTOs
- request validation and auth-context translation
- no business rules beyond simple translation and guardrails

`src/entrypoints/jobs`

- scheduled/background handlers
- examples:
  - outbox publisher
  - maintenance jobs
  - future queue consumers if they stay in this repo

`src/entrypoints/events`

- async consumer handlers
- examples:
  - identity user registration queue consumer
  - future SQS/EventBridge-driven integration handlers

`src/domain`

- business logic
- entities
- use-cases
- domain events
- policies and authorization rules
- interfaces for persistence or external communication

`src/adapters/db`

- Drizzle schema and migrations
- repository implementations for domain ports
- `UnitOfWork` implementation for transactional writes

`src/adapters/eventbridge`

- outbound implementation for publishing domain events to EventBridge

`src/shared`

- shared runtime config helpers
- shared HTTP response helpers

## Why Use-Cases Are Central

The main business operations should live in `domain/use-cases`.

Examples:

- `getPublicProfile`
- `getMyProfile`
- `updateMyPrivateProfile`
- `createProperty`

We still keep the command/query distinction conceptually:

- writes change state
- reads do not

But we do not need four separate folders of ceremony just to preserve that idea.

## Identity Model

Authentication is owned by Cognito, but the application still owns a `users` table.

Use this split:

- Cognito
  - authentication
  - password and login flows
  - JWT claims
  - coarse groups such as `admin`

- `users` table
  - internal application identity
  - foreign-key target for profiles and properties
  - lifecycle independent from Cognito attributes

Recommended linkage:

- `users.id`: internal UUID
- `users.identity_user_id`: canonical cross-service identity key
- `users.cognito_subject`: unique mapping to Cognito `sub`

This keeps the application from treating Cognito as the domain database.

### Registration Flow

The current intended registration flow is:

1. Cognito handles signup, password, and confirmation email delivery
2. `wumbo-identity` `PostConfirmation` creates or updates the canonical identity user
3. `wumbo-identity` publishes `identity.user.registered.v1`
4. an async consumer in `wumbo-core` runs `registerUserFromIdentity`
5. first-time registration writes `user-registered.v1` to the outbox

This keeps identity lifecycle concerns in Cognito while still giving the domain
its own application user record.

## First Realistic Example Model

The first full example should use these tables:

- `users`
- `public_profiles`
- `private_profiles`
- `properties`
- `outbox_events`

### users

Purpose:

- internal app user identity
- links Cognito users to domain records

Suggested columns:

- `id`
- `identity_user_id`
- `cognito_subject`
- `email`
- `status`
- `created_at`
- `updated_at`

### public_profiles

Purpose:

- information safe to expose broadly
- publicly readable profile data

Suggested columns:

- `user_id`
- `handle`
- `display_name`
- `bio`
- `avatar_url`
- `created_at`
- `updated_at`

Rules:

- public read
- owner update
- admin override allowed

### private_profiles

Purpose:

- information that should never be returned by public profile reads
- user-controlled private settings and contact details

Suggested columns:

- `user_id`
- `legal_name`
- `phone_number`
- `contact_email`
- `city`
- `state_region`
- `country_code`
- `created_at`
- `updated_at`

Rules:

- only owner can read
- only owner can update
- admin override allowed if the product needs it

### properties

Purpose:

- realistic owned resource
- ownership-driven authorization example

Suggested columns:

- `id`
- `owner_user_id`
- `slug`
- `title`
- `description`
- `visibility`
- `created_at`
- `updated_at`

Rules:

- public read only when visible/published
- authenticated create
- only owner can update
- admin override allowed

### outbox_events

Purpose:

- reliable event publication from successful transactions

Rules:

- written in the same transaction as business changes
- later published by a scheduled job

## Public Vs Private Profile Split

Public and private profile data should remain separate in this template.

That split gives us:

- clearer access rules
- smaller risk of accidental leakage
- cleaner public-read queries
- a realistic pattern for sensitivity-based modeling

For this architecture, separate tables are preferred over a single wide profile table.

## Authorization Pattern

Authentication and authorization are separate concerns.

Authentication:

- Cognito issues JWTs
- API Gateway validates them
- `entrypoints/api/auth` turns claims into an `ActorContext`

Authorization:

- domain policies decide what the actor can do
- handlers do not contain permission logic beyond basic presence checks

Examples:

- `canReadPublicProfile(actor, profile)`
- `canUpdatePublicProfile(actor, profileOwnerId)`
- `canReadPrivateProfile(actor, profileOwnerId)`
- `canUpdateProperty(actor, property)`

Recommended rule style:

- keep policy functions pure
- pass in the actor and either the target aggregate or the ownership fields needed
- unit test the policy matrix directly

## First API Surface

The first meaningful routes should be:

- `GET /profiles/{handle}`
- `GET /v1/me`
- `GET /v1/me/profile`
- `PATCH /v1/me/public-profile`
- `PATCH /v1/me/private-profile`
- `GET /properties/{slug}`
- `POST /v1/properties`
- `PATCH /v1/properties/{propertyId}`

This gives us:

- unauthenticated public reads
- authenticated self-service profile reads/updates
- ownership-based updates
- admin override scenarios

## Domain Ports

The domain should define ports for what it needs, not for how the adapter works.

Examples:

- `UsersRepository`
- `PublicProfilesRepository`
- `PrivateProfilesRepository`
- `PropertiesRepository`
- `UnitOfWork`
- `EventOutbox`

Repository implementations then live in `src/adapters/db/repositories`.

This is another place where the tradeoff matters. In `wumbo-core`, repository and
outbox ports help because the use-cases and policies are the durable part of the
system. In a thinner service, adding ports for every database call can create more
complexity than value.

## Testing Strategy

Domain tests should focus on:

- policy functions
- use-cases
- domain errors and edge cases

Adapter tests should focus on:

- repository implementations
- migration compatibility
- transaction behavior
- outbox/event persistence

Entrypoint tests should focus on:

- request validation
- auth-context parsing
- async event translation
- use-case wiring
- permission enforcement

Smoke tests outside the repo:

- `wumbo-ui` + Cognito managed login
- deployed `wumbo-core` + dev database

## Seed Data

Use seeds for development convenience, not permanent schema definition.

Recommended dev seeds:

- one admin user
- one standard user
- one public profile
- one private profile
- one property owned by the standard user

This makes it easier to validate:

- public profile reads
- self reads
- owner updates
- non-owner denials
- admin overrides

## Implementation Status

The reference implementation now follows this structure:

- Phase 1 is complete:
  - `domain/model` is now `domain/entities`
  - `domain/exceptions` is now `domain/errors`
  - `entrypoints/api/model` is now `entrypoints/api/dto`

- Phase 2 is also complete:
  - command/query files have been collapsed into `domain/use-cases`
  - entrypoints now call those use-cases directly

- Phase 3 is now complete:
  - repository and adapter names have been tightened around the current boundaries
  - `UnitOfWork` lives as its own port and concrete DB implementation
  - the DB adapter now exposes `db-dependencies.ts` plus `unit-of-work.ts`

- Phase 4 is now started:
  - user registration now has its own `registerUserFromIdentity` use-case
  - an async identity registration consumer exists in `src/entrypoints/events`
  - write flows no longer lazily create users during normal request handling

## Immediate Next Steps

1. Apply the new Drizzle migration against the dev database.
2. Seed a small reference dataset:
   - admin user
   - standard user
   - public/private profiles
   - one owned property
3. Add domain, adapter, and API test suites around the profile/property permission matrix.
4. Deploy the refactored handlers to `wumbo-core-dev` against `marketplace/dev` and run the Cognito + `wumbo-ui` smoke flow end to end.
5. Verify the core permission paths:
   - owner property update
   - non-owner property denial
   - admin override

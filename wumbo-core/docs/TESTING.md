# wumbo-core Testing Strategy

This file captures the testing shape for the current reference architecture.

## Layers

### Domain Unit Tests

Location:

- [src/domain/tests](C:\Users\adrot\Projects\wumbo\wumbo-core\src\domain\tests)

What to test:

- policy functions
- use-cases
- exception cases
- edge-case business rules

Goal:

- verify business logic without touching AWS or Postgres

Current runner:

- Node's built-in test runner via `tsx`
- `npm run test:domain`
- `npm run test:api`
- `npm run test:db`

### Adapter Integration Tests

Location:

- `src/adapters/db/tests`
- `src/adapters/eventbridge/tests`

What to test:

- Drizzle repository implementations
- migrations against a real Postgres database
- transaction boundaries
- outbox persistence
- event publisher behavior with mocked AWS clients

Goal:

- verify infrastructure implementations satisfy domain ports

Notes:

- use a real Postgres instance for DB adapter tests
- do not mock Drizzle for repository behavior
- focus here on migrations, repository correctness, and `UnitOfWork` commit/rollback semantics
- set `TEST_DATABASE_URL` to enable this suite; otherwise it should skip cleanly

### API Adapter Tests

Location:

- `src/entrypoints/api/tests`
- `src/entrypoints/events/tests`

What to test:

- route wiring
- validation
- auth-context translation
- command/query dispatch
- HTTP status and response shapes

Goal:

- verify handler translation and HTTP behavior without re-testing all domain logic

Good first targets:

- auth-context parsing
- error-to-response mapping
- one public read handler
- one authenticated write handler
- identity registration queue consumer

### Job Tests

Location:

- `src/entrypoints/jobs/tests`

What to test:

- scheduled job behavior
- outbox publisher batching
- failure and retry handling

### Async Consumer Tests

Location:

- `src/entrypoints/events/tests`

What to test:

- queue message parsing
- required identity event attributes
- use-case wiring
- idempotent registration behavior through the domain tests

### Cloud Smoke Tests

Location:

- deployed `wumbo-core-dev` against the applied `marketplace/dev` infrastructure

What to test:

- Cognito login
- API Gateway JWT auth
- Lambda -> Postgres connectivity
- outbox publisher flow

Goal:

- prove the real serverless deployment works with AWS-managed services

## Reference Permission Matrix

The first major permission test set should include:

- anonymous user can read a public profile
- anonymous user cannot read a private profile
- authenticated user can read their own private profile
- authenticated user cannot read another user's private profile
- authenticated owner can update their property
- authenticated non-owner cannot update that property
- admin can update another user's property

## Practical Testing Pyramid For This Repo

The expected balance is:

1. many fast domain tests
2. fewer DB adapter integration tests
3. a small number of handler tests
4. a very small but mandatory cloud smoke suite

If a behavior can be tested cleanly in the domain, prefer that first.

## Recommended Test Data

- one admin user
- one standard user
- one second standard user
- public/private profiles for both users
- one property owned by the first standard user

This seed set is enough to prove:

- public access rules
- ownership rules
- role-based overrides

## Near-Term Test Plan

Phase 1:

- domain policy tests
- domain use-case tests with fakes

Phase 2:

- migration test against a fresh Postgres database
- repository integration tests
- `UnitOfWork` rollback/commit tests

Phase 3:

- API handler tests
- async consumer handler tests
- outbox publisher tests
- deployed cloud smoke tests

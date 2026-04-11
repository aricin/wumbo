# wumbo-core Refactor Plan

This plan captures the next cleanup pass for `wumbo-core`.

The goal is not to invent a heavier architecture. The goal is to simplify the current code while keeping the most important properties:

- domain/business logic stays isolated and testable
- persistence stays behind ports and dependency injection
- HTTP/Lambda details stay in entrypoints
- Postgres/Drizzle details stay in the DB adapter
- transactional writes stay explicit through `UnitOfWork`

## Target Structure

```text
src/
  domain/
    entities/
    policies/
    use-cases/
    ports/
    errors/
    events/

  entrypoints/
    api/
      handlers/
      auth/
      dto/
    jobs/

  adapters/
    db/
      schema/
      migrations/
      repositories/
      unit-of-work.ts
    eventbridge/

  shared/
    config/
    http/
```

## Vocabulary

Use this language consistently during the refactor:

- `entrypoints`
  - primary adapters
  - Lambda/API/job boundaries that translate external input into use-case calls

- `domain/entities`
  - core business entities only

- `domain/policies`
  - authorization and business rules

- `domain/use-cases`
  - business operations
  - reads and writes can both live here for now

- `domain/ports`
  - interfaces the domain depends on
  - repository interfaces live here
  - `UnitOfWork` also lives here

- `adapters/db/repositories`
  - concrete Postgres implementations of domain repository ports

- `adapters/db/unit-of-work.ts`
  - concrete Postgres transaction implementation of the `UnitOfWork` port

- `adapters/db/schema` and `adapters/db/migrations`
  - persistence assets
  - these support the DB adapter, but they are not themselves domain code

## Main Design Decisions

### 1. Keep AWS's coarse structure

We will keep:

- `domain`
- `entrypoints`
- `adapters`

This matches the AWS hexagonal guidance closely enough while still letting us simplify the internals.

### 2. Collapse command/query folder ceremony into `use-cases`

Instead of:

- `commands`
- `queries`
- `command_handlers`
- `query_handlers`

we will move toward:

- `domain/use-cases`

That keeps the command/query distinction conceptually, but reduces directory overhead.

### 3. Rename `model` to `entities`

This makes the domain language more concrete.

Instead of:

- `domain/model`

we want:

- `domain/entities`

### 4. Rename `exceptions` to `errors`

This reads more naturally in TypeScript and matches how the code is actually used.

### 5. Rename API `model` to `dto`

API boundary types are DTOs, not domain models.

Instead of:

- `entrypoints/api/model`

we want:

- `entrypoints/api/dto`

### 6. Keep repository interfaces under `domain/ports`

The folder name should remain `ports`.

Inside that folder, some ports are repositories:

- `UsersRepository`
- `PublicProfilesRepository`
- `PrivateProfilesRepository`
- `PropertiesRepository`

`UnitOfWork` remains a separate port because it is a transaction boundary, not a repository.

### 7. Keep DB implementations under `adapters/db/repositories`

These are the concrete Postgres/Drizzle implementations of the repository ports.

### 8. Keep `UnitOfWork` separate from repositories

`UnitOfWork` is not a repository.

It coordinates multiple repository operations in a single transaction.

That means:

- use cases that only read may depend directly on repositories
- use cases that write will usually depend on `UnitOfWork`

## Repository/Port Direction

We want fewer, clearer ports than we have now.

Instead of mirroring tables too closely, we should shape ports around domain consistency boundaries and common business usage.

Current direction:

- `UsersRepository`
  - user lookup / ensure-from-identity behavior

- `PublicProfilesRepository`
  - public profile reads and writes

- `PrivateProfilesRepository`
  - private profile reads and writes

- `PropertiesRepository`
  - property reads/writes

- `UnitOfWork`
  - transaction boundary for write use-cases

- `EventOutbox`
  - event persistence and publish-state tracking without forcing repository terminology

## Refactor Phases

### Phase 1. Rename directories and clarify intent

Changes:

- `domain/model` -> `domain/entities`
- `domain/exceptions` -> `domain/errors`
- `entrypoints/api/model` -> `entrypoints/api/dto`
- add/readjust short README files in key folders

Goal:

- make the codebase easier to navigate without changing behavior

Status:

- completed

### Phase 2. Collapse use-case directories

Changes:

- move `commands`, `queries`, `command_handlers`, and `query_handlers` into `domain/use-cases`
- use straightforward filenames such as:
  - `get-public-profile.ts`
  - `get-my-profile.ts`
  - `update-my-public-profile.ts`
  - `create-property.ts`

Goal:

- keep the business flow obvious
- remove unnecessary directory ceremony

Status:

- completed

### Phase 3. Simplify ports

Changes:

- reevaluate current repository interfaces
- likely move toward:
  - `UsersRepository`
  - `ProfilesRepository`
  - `PropertiesRepository`
  - `UnitOfWork`

Goal:

- reduce table-shaped abstractions
- make the dependency graph easier to understand

Status:

- completed

### Phase 4. Simplify DB adapter structure

Changes:

- keep concrete repository implementations in `adapters/db/repositories`
- keep one `adapters/db/unit-of-work.ts`
- keep `schema` and `migrations` as persistence assets
- add mappers only if needed; do not add them preemptively

Goal:

- keep the DB adapter concrete and easy to follow

### Phase 5. Update tests around the simplified structure

Changes:

- domain tests target entities, policies, and use-cases
- adapter tests target repository implementations and transaction behavior
- entrypoint tests target request/auth translation and HTTP behavior

Goal:

- make the testing strategy match the simplified architecture

## Concrete File Mapping

Current -> target direction:

- `src/domain/model/*`
  -> `src/domain/entities/*`

- `src/domain/exceptions/*`
  -> `src/domain/errors/*`

- `src/entrypoints/api/model/*`
  -> `src/entrypoints/api/dto/*`

- `src/domain/commands/*`
  -> `src/domain/use-cases/*`

- `src/domain/queries/*`
  -> `src/domain/use-cases/*`

- `src/domain/command_handlers/*`
  -> `src/domain/use-cases/*`

- `src/domain/query_handlers/*`
  -> `src/domain/use-cases/*`

- `src/adapters/db/repositories/*`
  -> stays, but repository names may change as ports are simplified

- `src/adapters/db/client/connection.ts`
  -> stays for now

- `src/adapters/db/unit-of-work.ts`
  -> `src/adapters/db/unit-of-work.ts`

## Immediate Next Step

The next practical step is Phase 5:

1. add seed data for the realistic profile/property slice
2. add domain tests around the permission matrix
3. add adapter tests around repository behavior and `UnitOfWork`
4. add entrypoint tests for request/auth translation

That keeps the refactor grounded in working behavior instead of adding more structural churn.

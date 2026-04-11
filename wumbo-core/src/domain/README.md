# Domain

This folder owns the business core of `wumbo-core`.

It should stay free of:

- Lambda handler concerns
- HTTP request/response types
- AWS SDK clients
- Drizzle schema definitions
- SQL/storage details

It should own:

- entities
- policies
- use-cases
- domain events
- domain errors
- ports the core depends on

If a file in this folder starts looking AWS-specific or Postgres-specific, it probably belongs somewhere else.

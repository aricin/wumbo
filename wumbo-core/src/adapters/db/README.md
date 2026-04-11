# DB Adapter

This folder contains the Postgres-specific secondary adapter for `wumbo-core`.

It owns:

- Drizzle schema definitions
- SQL migrations
- concrete repository implementations
- the concrete `UnitOfWork` implementation for transactional writes

This layer answers the question:

- how does the application talk to Postgres?

It should not own business rules. It should implement the persistence contracts defined in `src/domain/ports`.

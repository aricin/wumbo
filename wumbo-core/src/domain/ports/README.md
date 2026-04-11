# Domain Ports

This folder contains interfaces the domain depends on.

These are ports, not implementations.

In practice, this includes:

- repository interfaces such as user/profile/property persistence contracts
- `UnitOfWork`, which defines the transaction boundary for write use-cases

These files should describe what the domain needs, not how Postgres or Drizzle works.

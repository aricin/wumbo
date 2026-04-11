This folder contains DB adapter integration tests.

These tests should:

- run against a real Postgres database
- verify repository behavior against the real schema
- verify `UnitOfWork` commit and rollback semantics
- avoid mocking Drizzle or SQL behavior

Use `TEST_DATABASE_URL` to point the suite at a dedicated test database or an isolated local/dev target.

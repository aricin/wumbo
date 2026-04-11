This folder contains API boundary tests.

These tests should focus on:

- request and path parsing
- auth-context translation
- HTTP response mapping
- handler wiring into use-cases

They should not duplicate deep business-rule coverage that already exists in `src/domain/tests`.

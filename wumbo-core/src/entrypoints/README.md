# Entrypoints

This folder contains the primary adapters for `wumbo-core`.

These are the ways the outside world enters the application, such as:

- HTTP/API requests
- async queue or bus events
- scheduled jobs

Entrypoints should translate external input into domain use-case calls.

They should stay thin:

- parse input
- build auth/context objects
- call a use-case
- shape the response

They should not own business rules or persistence logic.

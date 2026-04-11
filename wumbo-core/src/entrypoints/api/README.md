# API Entrypoint

This folder owns the HTTP/API boundary for `wumbo-core`.

It includes:

- Lambda handlers
- auth/context translation
- API DTOs

This layer is responsible for HTTP concerns only:

- request parsing
- status codes
- auth claim translation
- response shaping

It should not contain core business rules or direct SQL/Drizzle logic.

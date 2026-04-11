# Domain Use-Cases

This folder contains the business operations of `wumbo-core`.

Each file should describe one meaningful action, for example:

- get a public profile
- update my private profile
- create a property

Use-cases may depend on ports such as repositories or `UnitOfWork`, but they should remain free of:

- Lambda request/response concerns
- Drizzle query code
- SQL details
- AWS SDK clients

# Resource Naming

Wumbo infrastructure uses naming based on **ownership type**, not one blanket
prefix for every resource.

## 1. Environment-shared resources

Use environment-scoped naming for resources that are shared base infrastructure
for the whole account environment.

Examples:

- `wumbo-dev-vpc`
- `wumbo-dev-private-1`
- `wumbo-dev-public-1`

These resources should not carry a `Service` tag because they are not owned by a
single service.

## 2. Workload-shared resources

Use workload-scoped naming for resources shared across multiple services inside a
workload.

Examples:

- `wumbo-marketplace-dev-postgres`
- `wumbo-marketplace-dev-domain-events`
- `wumbo-marketplace-dev-apps`

Use this pattern when the resource belongs to the marketplace workload as a
whole, rather than to one service.

Typical tags:

- `Workload=marketplace`
- no `Service` tag unless the resource is truly service-owned

## 3. Service-owned resources

Use service-scoped naming for resources owned and deployed by one service.

Examples:

- `wumbo-core-dev-update-contractor-profile`
- `wumbo-identity-dev-post-confirmation`
- `wumbo-ui-dev`
- `wumbo-admin-dev`

Typical tags:

- `Service=identity`
- `Service=ui`
- optionally `Workload=marketplace` when the service belongs to that workload

## SSM Parameter Paths

SSM paths follow the same ownership model.

Environment-shared:

- `/<project>/<environment>/...`

Workload-shared:

- `/<project>/<workload>/<environment>/...`
- example: `/wumbo/marketplace/dev/databases/marketplace/*`

Service-owned:

- `/<project>/<service>/<environment>/...`
- examples:
  - `/wumbo/identity/dev/cognito/*`
  - `/wumbo/ui/dev/app/*`

## Current Wumbo Decisions

- Marketplace PostgreSQL is workload-shared.
- The shared marketplace datastore path is a namespace for the shared relational store, not a logical application database named `marketplace`.
- Logical Postgres databases are service-owned and currently include `core` and `identity`.
- The EventBridge domain bus is workload-shared.
- The ECS cluster is workload-shared.
- Cognito is identity-owned.
- `ui` and `admin` are service-owned apps.
- Core Lambdas are service-owned.

## Rule of Thumb

- If one service owns and deploys it, name it by **service**.
- If many services within a workload share it, name it by **workload**.
- If it is foundational environment plumbing, name it by **environment**.

# observability

Creates a small shared observability baseline for `wumbo`:

- `standard` and `critical` SNS alert topics
- optional email subscriptions for both topics
- a first-pass RDS alarm set
- a shared CloudWatch operations dashboard
- SSM parameters for the alert topic ARNs and dashboard name

When `workload_name` is set, the alert topic names, alarm names, dashboard name, and default SSM paths become workload-scoped, such as:

- `wumbo-marketplace-dev-alerts-standard`
- `wumbo-marketplace-dev-alerts-critical`
- `wumbo-marketplace-dev-operations`
- `/wumbo/marketplace/dev/observability/*`

# eventbridge module

Creates a custom EventBridge bus for domain events and publishes its metadata to
SSM Parameter Store.

Current resources:

- one custom event bus named `${project_name}-${workload_name}-${environment}-domain-events` when `workload_name` is provided, otherwise `${project_name}-${environment}-domain-events`
- SSM parameters for the bus name and ARN under `/<prefix>/events/domain/*`

Current intent:

- `wumbo-core` publishes domain events to this bus
- downstream consumer repos can read the bus metadata from Terraform outputs or
  SSM
- the default SSM prefix becomes workload-scoped when `workload_name` is set, such as `/wumbo/marketplace/dev/events/domain/*`

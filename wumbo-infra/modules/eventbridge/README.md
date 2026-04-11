# eventbridge module

Creates a custom EventBridge bus for domain events and publishes its metadata to
SSM Parameter Store.

Current resources:

- one custom event bus named `${project_name}-${environment}-domain-events`
- SSM parameters for the bus name and ARN under `/<prefix>/events/domain/*`

Current intent:

- `wumbo-core` publishes domain events to this bus
- downstream consumer repos can read the bus metadata from Terraform outputs or
  SSM

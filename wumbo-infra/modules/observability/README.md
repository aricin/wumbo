# observability

Creates a small shared observability baseline for `wumbo`:

- `standard` and `critical` SNS alert topics
- optional email subscriptions for both topics
- a first-pass RDS alarm set
- a shared CloudWatch operations dashboard
- SSM parameters for the alert topic ARNs and dashboard name

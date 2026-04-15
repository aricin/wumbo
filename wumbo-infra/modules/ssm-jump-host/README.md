# ssm-jump-host

Low-friction no-ingress jump host for reaching private services such as RDS through AWS Systems Manager Session Manager.

## What It Does

This module creates:

- one small EC2 instance in a public subnet
- one IAM role and instance profile with `AmazonSSMManagedInstanceCore`
- one security group with no inbound rules
- SSM parameters for the jump-host instance ID and security group ID

The instance gets outbound internet access through a public subnet so the SSM agent can reach AWS Systems Manager endpoints without needing NAT or PrivateLink.

## Why This Shape

- no inbound SSH port
- private database stays private
- simple local developer workflow through SSM port forwarding
- lower cost than introducing NAT just for operator access

## Key Inputs

- optional `workload_name`
- `subnet_id`: public subnet for the instance
- `vpc_id`, `vpc_cidr`: network placement and private egress scope
- `instance_type`: EC2 size for the jump host
- `remote_port`: private service port to reach, default `5432`
- `remote_cidr_blocks`: CIDRs the host may reach on the remote port
- `ssm_parameter_prefix`: where to write helper SSM parameters

## Outputs

- `instance_id`
- `instance_arn`
- `public_ip`
- `security_group_id`
- `parameter_prefix`

## Local Dev Flow

After apply, start a port-forwarding session like this:

```powershell
aws ssm start-session `
  --target i-0123456789abcdef0 `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters host=["your-rds-endpoint.us-east-1.rds.amazonaws.com"],portNumber=["5432"],localPortNumber=["15432"]
```

Then connect your local DB client to `127.0.0.1:15432`.

## Notes

- This is intentionally the simple first pass, not the most locked-down final form.
- A stricter future version would keep the jump host fully private and replace outbound internet with Systems Manager VPC endpoints.
- When `workload_name` is set, the jump-host names and default SSM paths become workload-scoped, such as `wumbo-marketplace-dev-jump` and `/wumbo/marketplace/dev/ops/jump-host/*`.

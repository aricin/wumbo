# network

Lean VPC module for early `wumbo` environments.

## What It Does

This module creates:

- one VPC
- one private route table
- isolated private subnets across at least two Availability Zones
- optional public subnets and an internet gateway for simple access patterns like an SSM jump host
- an optional single NAT gateway in the first public subnet for private subnet HTTPS egress

The goal is to keep the network shape simple and cost-aware while still satisfying the requirements for RDS and early Lambda networking.

## When To Use It

Use this module when an environment needs a minimal private network for stateful services like RDS.

If you later add more complex Lambda, ECS, or multi-AZ egress requirements, you can extend or replace this module.

## Key Inputs

- `project_name`: naming prefix
- `environment`: environment name such as `dev` or `prod`
- `vpc_cidr`: CIDR block for the VPC
- `availability_zone_count`: how many AZs to spread private subnets across
- `private_subnet_newbits`: how aggressively to carve subnets from the VPC CIDR
- `public_subnet_count`: how many public subnets to create
- `public_subnet_newbits`: how aggressively to carve public subnets from the VPC CIDR
- `nat_gateway_enabled`: whether to route the private route table through a single NAT gateway
- `tags`: additional AWS tags

## Outputs

- `vpc_id`
- `vpc_cidr`
- `private_subnet_ids`
- `public_subnet_ids`
- `availability_zones`
- `nat_gateway_id`
- `nat_gateway_public_ip`

## Example

```hcl
module "network" {
  source = "../../modules/network"

  project_name            = "wumbo"
  environment             = "dev"
  vpc_cidr                = "10.20.0.0/16"
  availability_zone_count = 2
  private_subnet_newbits  = 8
  public_subnet_count     = 1
  nat_gateway_enabled     = true
}
```

## Notes

- Public subnets are optional and exist mainly to support a low-friction no-ingress SSM jump host.
- The NAT gateway is intentionally a single-AZ cost-optimized baseline, not a fully multi-AZ egress design.

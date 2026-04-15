# rds-postgres

Standard RDS PostgreSQL module for early `wumbo` environments.

## What It Does

This module creates:

- one PostgreSQL RDS instance
- one DB subnet group
- one database security group
- one DB parameter group
- one KMS key and alias for database encryption and secrets
- one Secrets Manager secret for the master password
- SSM parameters for non-sensitive connection metadata

It is intentionally based on standard RDS PostgreSQL, not Aurora, to keep the initial cost and complexity lower.

## Secrets Model

The master password is generated with Terraform write-only arguments and stored in Secrets Manager.

Connection details that are safe to share between repos are written to SSM under:

`/<project>/<environment>/databases/<database_label>/*`

That includes:

- host
- port
- database name
- username
- secret ARN

## Key Inputs

- `vpc_id`, `vpc_cidr`, `private_subnet_ids`: network placement
- `db_name`, `db_username`, `db_port`: database basics
- `database_label`: stable path/tag label such as `marketplace` or `identity`
- `instance_class`, `engine_version`, `parameter_group_family`: compute and engine settings
- `allocated_storage`, `max_allocated_storage`, `storage_type`, `iops`: storage settings
- `multi_az`: availability setting
- `deletion_protection`, `skip_final_snapshot`: lifecycle safety
- `allowed_cidr_blocks`: network access into PostgreSQL
- `password_version`: increment this when you want Terraform to rotate the generated password

## Outputs

- `db_instance_id`
- `db_instance_arn`
- `db_address`
- `db_port`
- `db_name`
- `db_security_group_id`
- `master_secret_arn`
- `parameter_prefix`

## Example

```hcl
module "database" {
  source = "../../modules/rds-postgres"

  project_name           = "wumbo"
  environment            = "dev"
  vpc_id                 = module.network.vpc_id
  vpc_cidr               = module.network.vpc_cidr
  private_subnet_ids     = module.network.private_subnet_ids
  database_label         = "marketplace"
  db_identifier          = "wumbo-marketplace-dev-postgres"
  db_name                = "wumbo"
  db_username            = "wumbo"
  instance_class         = "db.t4g.micro"
  engine_version         = "16"
  parameter_group_family = "postgres16"
}
```

## Notes

- This module expects Terraform `1.11+`.
- By default, if `allowed_cidr_blocks` is not provided, the database security group allows PostgreSQL from the whole VPC CIDR.
- For a tighter setup later, you will probably want to replace CIDR-based access with security-group-based access from app compute.

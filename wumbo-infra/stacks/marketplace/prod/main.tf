provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn     = "arn:aws:iam::${var.target_account_id}:role/${var.assume_role_name}"
    session_name = "${var.project_name}-${local.workload_name}-${var.environment}-stack"
  }

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project_name
      Environment = var.environment
      Workload    = local.workload_name
      ManagedBy   = "Terraform"
      Stack       = "${local.workload_name}-${var.environment}"
    })
  }
}

locals {
  workload_name         = "marketplace"
  identity_service_name = "identity"
  ui_service_name       = "ui"
  workload_parameter_prefix = trim(
    var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${local.workload_name}/${var.environment}",
    "/",
  )
  identity_parameter_prefix = "/${var.project_name}/${local.identity_service_name}/${var.environment}"
  ui_parameter_prefix       = "/${var.project_name}/${local.ui_service_name}/${var.environment}"

  ui_custom_domain_url = module.ecs_ui.custom_domain_url

  cognito_ui_callback_urls = local.ui_custom_domain_url != null ? [
    "${local.ui_custom_domain_url}/api/auth/callback",
  ] : var.cognito_ui_callback_urls

  cognito_ui_logout_urls = local.ui_custom_domain_url != null ? [
    local.ui_custom_domain_url,
  ] : var.cognito_ui_logout_urls
}

moved {
  from = module.ui_service
  to   = module.ecs_ui
}

moved {
  from = module.auth
  to   = module.identity
}

moved {
  from = module.marketplace_database
  to   = module.marketplace_postgres
}

check "jump_host_requires_public_subnet" {
  assert {
    condition     = !var.jump_host_enabled || length(module.network.public_subnet_ids) > 0
    error_message = "jump_host_enabled requires at least one public subnet. Set public_subnet_count to 1 or disable the jump host."
  }
}

check "ui_service_requires_two_public_subnets" {
  assert {
    condition     = length(module.network.public_subnet_ids) >= 2
    error_message = "ui requires at least two public subnets across distinct AZs for the internet-facing ALB."
  }
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f1df2642fe",
  ]
}

module "network" {
  source = "../../../modules/network"

  project_name            = var.project_name
  environment             = var.environment
  vpc_cidr                = var.vpc_cidr
  availability_zone_count = var.availability_zone_count
  private_subnet_newbits  = var.private_subnet_newbits
  public_subnet_count     = var.public_subnet_count
  public_subnet_newbits   = var.public_subnet_newbits
  nat_gateway_enabled     = var.nat_gateway_enabled
  tags                    = var.tags
}

module "marketplace_postgres" {
  source = "../../../modules/rds-postgres"

  project_name                      = var.project_name
  environment                       = var.environment
  vpc_id                            = module.network.vpc_id
  vpc_cidr                          = module.network.vpc_cidr
  private_subnet_ids                = module.network.private_subnet_ids
  parameter_prefix                  = local.workload_parameter_prefix
  database_label                    = local.workload_name
  db_identifier                     = var.db_identifier
  db_name                           = var.db_name
  db_username                       = var.db_username
  db_port                           = var.db_port
  instance_class                    = var.db_instance_class
  engine_version                    = var.db_engine_version
  parameter_group_family            = var.db_parameter_group_family
  allocated_storage                 = var.db_allocated_storage
  max_allocated_storage             = var.db_max_allocated_storage
  storage_type                      = var.db_storage_type
  iops                              = var.db_iops
  multi_az                          = var.db_multi_az
  backup_retention_period           = var.db_backup_retention_period
  backup_window                     = var.db_backup_window
  maintenance_window                = var.db_maintenance_window
  deletion_protection               = var.db_deletion_protection
  skip_final_snapshot               = var.db_skip_final_snapshot
  apply_immediately                 = var.db_apply_immediately
  monitoring_interval               = var.db_monitoring_interval
  performance_insights_enabled      = var.db_performance_insights_enabled
  enabled_cloudwatch_logs_exports   = var.db_enabled_cloudwatch_logs_exports
  cloudwatch_logs_retention_in_days = var.db_cloudwatch_logs_retention_in_days
  slow_query_log_min_duration_ms    = var.db_slow_query_log_min_duration_ms
  allowed_cidr_blocks               = var.db_allowed_cidr_blocks
  password_version                  = var.db_password_version
  tags                              = var.tags
}

module "ecs_ui" {
  source = "../../../modules/ecs-ui"

  project_name              = var.project_name
  environment               = var.environment
  service_name              = local.ui_service_name
  workload_name             = local.workload_name
  parameter_prefix          = local.ui_parameter_prefix
  identity_parameter_prefix = local.identity_parameter_prefix
  vpc_id                    = module.network.vpc_id
  vpc_cidr                  = module.network.vpc_cidr
  public_subnet_ids         = module.network.public_subnet_ids
  private_subnet_ids        = module.network.private_subnet_ids
  domain_name               = var.ui_domain_name
  route53_zone_id           = var.ui_route53_zone_id
  certificate_arn           = var.ui_certificate_arn
  deletion_protection       = true
  github_repository         = var.ui_github_repository
  github_oidc_provider_arn  = aws_iam_openid_connect_provider.github_actions.arn
  tags                      = var.tags
}

module "identity" {
  source = "../../../modules/cognito"

  project_name                 = var.project_name
  environment                  = var.environment
  service_name                 = local.identity_service_name
  aws_region                   = var.aws_region
  parameter_prefix             = local.identity_parameter_prefix
  allow_self_signup            = var.cognito_allow_self_signup
  deletion_protection          = var.cognito_deletion_protection
  admin_group_name             = var.cognito_admin_group_name
  customer_group_name          = var.cognito_customer_group_name
  ui_domain_prefix             = var.cognito_ui_domain_prefix
  ui_callback_urls             = local.cognito_ui_callback_urls
  ui_logout_urls               = local.cognito_ui_logout_urls
  ui_oauth_scopes              = var.cognito_ui_oauth_scopes
  post_confirmation_lambda_arn = var.cognito_post_confirmation_lambda_arn
  tags                         = var.tags
}

module "events" {
  source = "../../../modules/eventbridge"

  project_name     = var.project_name
  environment      = var.environment
  workload_name    = local.workload_name
  parameter_prefix = local.workload_parameter_prefix
  tags             = var.tags
}

module "observability" {
  source = "../../../modules/observability"

  project_name               = var.project_name
  environment                = var.environment
  workload_name              = local.workload_name
  parameter_prefix           = local.workload_parameter_prefix
  db_instance_identifier     = module.marketplace_postgres.db_instance_identifier
  alert_email_addresses      = var.alert_email_addresses
  ui_enabled                 = true
  ui_cluster_name            = module.ecs_ui.cluster_name
  ui_service_name            = module.ecs_ui.service_name
  ui_alb_arn_suffix          = module.ecs_ui.alb_arn_suffix
  ui_target_group_arn_suffix = module.ecs_ui.target_group_arn_suffix
  tags                       = var.tags
}

module "jump_host" {
  count  = var.jump_host_enabled ? 1 : 0
  source = "../../../modules/ssm-jump-host"

  project_name         = var.project_name
  environment          = var.environment
  workload_name        = local.workload_name
  subnet_id            = length(module.network.public_subnet_ids) > 0 ? module.network.public_subnet_ids[0] : null
  vpc_id               = module.network.vpc_id
  vpc_cidr             = module.network.vpc_cidr
  instance_type        = var.jump_host_instance_type
  remote_port          = var.db_port
  ssm_parameter_prefix = local.workload_parameter_prefix
  tags                 = var.tags
}

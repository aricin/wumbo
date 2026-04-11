output "target_account_id" {
  description = "AWS account targeted by this stack."
  value       = var.target_account_id
}

output "vpc_id" {
  description = "ID of the workload VPC."
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs used for database infrastructure."
  value       = module.network.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs used for low-cost operator access patterns."
  value       = module.network.public_subnet_ids
}

output "nat_gateway_id" {
  description = "ID of the single NAT gateway used for private subnet egress, if enabled."
  value       = module.network.nat_gateway_id
}

output "nat_gateway_public_ip" {
  description = "Public IP allocated to the NAT gateway, if enabled."
  value       = module.network.nat_gateway_public_ip
}

output "db_address" {
  description = "DNS address of the PostgreSQL instance."
  value       = module.database.db_address
}

output "db_port" {
  description = "Port exposed by the PostgreSQL instance."
  value       = module.database.db_port
}

output "db_name" {
  description = "Initial database name."
  value       = module.database.db_name
}

output "db_security_group_id" {
  description = "Security group attached to the PostgreSQL instance."
  value       = module.database.db_security_group_id
}

output "master_secret_arn" {
  description = "Secrets Manager ARN with the DB master password."
  value       = module.database.master_secret_arn
}

output "db_kms_key_arn" {
  description = "KMS key ARN protecting the database storage and master secret."
  value       = module.database.kms_key_arn
}

output "parameter_prefix" {
  description = "Resolved SSM parameter prefix for this environment."
  value       = module.database.parameter_prefix
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID for this environment."
  value       = module.auth.user_pool_id
}

output "cognito_issuer_url" {
  description = "JWT issuer URL for this environment's Cognito user pool."
  value       = module.auth.issuer_url
}

output "cognito_ui_client_id" {
  description = "App client ID intended for wumbo-ui."
  value       = module.auth.ui_client_id
}

output "cognito_ui_domain_url" {
  description = "Hosted-login domain URL for wumbo-ui, if configured."
  value       = module.auth.ui_domain_url
}

output "cognito_ui_callback_urls" {
  description = "OAuth callback URLs configured for wumbo-ui."
  value       = module.auth.ui_callback_urls
}

output "cognito_ui_logout_urls" {
  description = "OAuth logout URLs configured for wumbo-ui."
  value       = module.auth.ui_logout_urls
}

output "cognito_admin_client_id" {
  description = "App client ID intended for wumbo-admin."
  value       = module.auth.admin_client_id
}

output "cognito_jwt_audiences" {
  description = "JWT audiences that wumbo-core should accept."
  value       = module.auth.jwt_audiences
}

output "cognito_post_confirmation_lambda_arn" {
  description = "Configured Cognito PostConfirmation Lambda ARN, if any."
  value       = module.auth.post_confirmation_lambda_arn
}

output "event_bus_name" {
  description = "Custom EventBridge bus name for domain events."
  value       = module.events.bus_name
}

output "event_bus_arn" {
  description = "Custom EventBridge bus ARN for domain events."
  value       = module.events.bus_arn
}

output "standard_alerts_topic_arn" {
  description = "SNS topic ARN for standard-priority alerts."
  value       = module.observability.standard_alerts_topic_arn
}

output "critical_alerts_topic_arn" {
  description = "SNS topic ARN for critical-priority alerts."
  value       = module.observability.critical_alerts_topic_arn
}

output "observability_dashboard_name" {
  description = "CloudWatch dashboard name for environment operations."
  value       = module.observability.dashboard_name
}

output "ui_repository_url" {
  description = "ECR repository URL used for wumbo-ui image pushes."
  value       = module.ecs_ui.repository_url
}

output "ui_ecs_cluster_name" {
  description = "ECS cluster name hosting wumbo-ui."
  value       = module.ecs_ui.cluster_name
}

output "ui_ecs_service_name" {
  description = "ECS service name hosting wumbo-ui."
  value       = module.ecs_ui.service_name
}

output "ui_task_family" {
  description = "Task definition family used by the wumbo-ui deploy workflow."
  value       = module.ecs_ui.task_family
}

output "ui_app_url" {
  description = "Base URL for the deployed wumbo-ui app."
  value       = module.ecs_ui.app_url
}

output "ui_github_actions_role_arn" {
  description = "IAM role ARN for the wumbo-ui GitHub Actions deploy workflow, if configured."
  value       = module.ecs_ui.github_actions_role_arn
}

output "jump_host_instance_id" {
  description = "EC2 instance ID for the SSM jump host, if enabled."
  value       = var.jump_host_enabled ? module.jump_host[0].instance_id : null
}

output "jump_host_security_group_id" {
  description = "Security group ID for the SSM jump host, if enabled."
  value       = var.jump_host_enabled ? module.jump_host[0].security_group_id : null
}

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

output "marketplace_postgres_address" {
  description = "DNS address of the shared marketplace PostgreSQL instance."
  value       = module.marketplace_postgres.db_address
}

output "marketplace_postgres_port" {
  description = "Port exposed by the shared marketplace PostgreSQL instance."
  value       = module.marketplace_postgres.db_port
}

output "marketplace_postgres_security_group_id" {
  description = "Security group attached to the shared marketplace PostgreSQL instance."
  value       = module.marketplace_postgres.db_security_group_id
}

output "marketplace_postgres_master_secret_arn" {
  description = "Secrets Manager ARN with the marketplace PostgreSQL master password."
  value       = module.marketplace_postgres.master_secret_arn
}

output "marketplace_postgres_kms_key_arn" {
  description = "KMS key ARN protecting the marketplace PostgreSQL storage and master secret."
  value       = module.marketplace_postgres.kms_key_arn
}

output "marketplace_parameter_prefix" {
  description = "Resolved SSM parameter prefix for marketplace-shared resources."
  value       = module.marketplace_postgres.parameter_prefix
}

output "ui_parameter_prefix" {
  description = "Resolved SSM parameter prefix for ui deploy metadata."
  value       = module.ecs_ui.parameter_prefix
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
  description = "ECR repository URL used for ui image pushes."
  value       = module.ecs_ui.repository_url
}

output "ui_ecs_cluster_name" {
  description = "ECS cluster name hosting ui."
  value       = module.ecs_ui.cluster_name
}

output "ui_ecs_service_name" {
  description = "ECS service name hosting ui."
  value       = module.ecs_ui.service_name
}

output "ui_task_family" {
  description = "Task definition family used by the ui deploy workflow."
  value       = module.ecs_ui.task_family
}

output "ui_app_url" {
  description = "Base URL for the deployed ui app."
  value       = module.ecs_ui.app_url
}

output "ui_github_actions_role_arn" {
  description = "IAM role ARN for the ui GitHub Actions deploy workflow, if configured."
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

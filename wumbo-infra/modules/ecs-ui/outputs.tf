output "parameter_prefix" {
  description = "Resolved SSM parameter prefix used for UI deploy metadata."
  value       = "/${local.parameter_prefix}"
}

output "repository_name" {
  description = "Name of the ECR repository that stores the UI service images."
  value       = aws_ecr_repository.this.name
}

output "repository_url" {
  description = "Repository URL for pushing the UI service images."
  value       = aws_ecr_repository.this.repository_url
}

output "cluster_name" {
  description = "Name of the ECS cluster hosting the UI service."
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "Name of the ECS service hosting the UI tasks."
  value       = aws_ecs_service.this.name
}

output "task_family" {
  description = "Task definition family used by the deploy workflow."
  value       = aws_ecs_task_definition.this.family
}

output "task_execution_role_arn" {
  description = "IAM role ARN used by ECS task execution."
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "IAM role ARN used by the running app container."
  value       = aws_iam_role.task.arn
}

output "github_actions_role_arn" {
  description = "IAM role ARN assumed by the UI GitHub Actions deploy workflow, if configured."
  value       = local.github_deploy_role_enabled ? aws_iam_role.github_actions[0].arn : null
}

output "log_group_name" {
  description = "CloudWatch Logs group that stores application logs."
  value       = aws_cloudwatch_log_group.this.name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer."
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Canonical hosted zone ID of the Application Load Balancer."
  value       = aws_lb.this.zone_id
}

output "alb_arn_suffix" {
  description = "ARN suffix used for ALB CloudWatch metrics."
  value       = aws_lb.this.arn_suffix
}

output "target_group_arn_suffix" {
  description = "ARN suffix used for target group CloudWatch metrics."
  value       = aws_lb_target_group.this.arn_suffix
}

output "service_security_group_id" {
  description = "Security group ID attached to the ECS tasks."
  value       = aws_security_group.service.id
}

output "custom_domain_url" {
  description = "Configured HTTPS custom domain URL, if any."
  value       = local.custom_domain_url
}

output "app_url" {
  description = "Base URL for the deployed app."
  value       = local.app_url
}

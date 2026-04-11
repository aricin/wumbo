output "standard_alerts_topic_name" {
  description = "Name of the standard-priority alert SNS topic."
  value       = aws_sns_topic.standard.name
}

output "standard_alerts_topic_arn" {
  description = "ARN of the standard-priority alert SNS topic."
  value       = aws_sns_topic.standard.arn
}

output "critical_alerts_topic_name" {
  description = "Name of the critical-priority alert SNS topic."
  value       = aws_sns_topic.critical.name
}

output "critical_alerts_topic_arn" {
  description = "ARN of the critical-priority alert SNS topic."
  value       = aws_sns_topic.critical.arn
}

output "dashboard_name" {
  description = "Name of the shared CloudWatch operations dashboard."
  value       = aws_cloudwatch_dashboard.operations.dashboard_name
}

output "parameter_prefix" {
  description = "Resolved SSM parameter prefix for observability metadata."
  value       = "/${local.parameter_prefix}"
}

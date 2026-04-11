output "bus_name" {
  description = "Name of the custom domain event bus."
  value       = aws_cloudwatch_event_bus.domain.name
}

output "bus_arn" {
  description = "ARN of the custom domain event bus."
  value       = aws_cloudwatch_event_bus.domain.arn
}

output "parameter_prefix" {
  description = "Resolved SSM parameter prefix for event metadata."
  value       = "/${local.parameter_prefix}"
}

locals {
  naming_prefix    = var.workload_name != null ? "${var.project_name}-${var.workload_name}-${var.environment}" : "${var.project_name}-${var.environment}"
  parameter_prefix = trim(var.parameter_prefix != null ? var.parameter_prefix : (var.workload_name != null ? "/${var.project_name}/${var.workload_name}/${var.environment}" : "/${var.project_name}/${var.environment}"), "/")
  bus_name         = "${local.naming_prefix}-domain-events"

  common_tags = merge(
    var.tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Layer       = "events"
    },
    var.workload_name != null ? { Workload = var.workload_name } : {},
  )
}

resource "aws_cloudwatch_event_bus" "domain" {
  name = local.bus_name

  tags = merge(local.common_tags, {
    Name = local.bus_name
  })
}

resource "aws_ssm_parameter" "bus_name" {
  name  = "/${local.parameter_prefix}/events/domain/bus-name"
  type  = "String"
  value = aws_cloudwatch_event_bus.domain.name
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "bus_arn" {
  name  = "/${local.parameter_prefix}/events/domain/bus-arn"
  type  = "String"
  value = aws_cloudwatch_event_bus.domain.arn
  tags  = local.common_tags
}

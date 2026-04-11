locals {
  parameter_prefix = trim(var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${var.environment}", "/")
  bus_name         = "${var.project_name}-${var.environment}-domain-events"

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Layer       = "events"
  })
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

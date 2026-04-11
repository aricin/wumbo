data "aws_region" "current" {}

locals {
  parameter_prefix = trim(var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${var.environment}", "/")
  dashboard_name   = coalesce(var.dashboard_name, "${var.project_name}-${var.environment}-operations")

  standard_topic_name = "${var.project_name}-${var.environment}-alerts-standard"
  critical_topic_name = "${var.project_name}-${var.environment}-alerts-critical"

  post_confirmation_function_name = "${var.core_service_name}-${var.environment}-post-confirmation"
  publish_outbox_function_name    = "${var.core_service_name}-${var.environment}-publish-outbox"
  ui_enabled = (
    var.ui_cluster_name != null &&
    var.ui_service_name != null &&
    var.ui_alb_arn_suffix != null &&
    var.ui_target_group_arn_suffix != null
  )

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Layer       = "observability"
  })

  ui_widgets = local.ui_enabled ? tolist([
    {
      type   = "metric"
      x      = 0
      y      = 18
      width  = 12
      height = 6
      properties = {
        title   = "UI Request Volume And Errors"
        region  = data.aws_region.current.region
        period  = 300
        view    = "timeSeries"
        stacked = false
        metrics = [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.ui_alb_arn_suffix, "TargetGroup", var.ui_target_group_arn_suffix, { "stat" = "Sum" }],
          [".", "HTTPCode_Target_5XX_Count", ".", ".", ".", ".", { "stat" = "Sum", "yAxis" = "right" }],
          [".", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.ui_alb_arn_suffix, { "stat" = "Sum", "yAxis" = "right" }],
        ]
      }
    },
    {
      type   = "metric"
      x      = 12
      y      = 18
      width  = 12
      height = 6
      properties = {
        title   = "UI Target Health And Latency"
        region  = data.aws_region.current.region
        period  = 300
        view    = "timeSeries"
        stacked = false
        metrics = [
          ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.ui_alb_arn_suffix, "TargetGroup", var.ui_target_group_arn_suffix, { "stat" = "Average" }],
          [".", "UnHealthyHostCount", ".", ".", ".", ".", { "stat" = "Average", "yAxis" = "right" }],
          [".", "TargetResponseTime", ".", ".", ".", ".", { "stat" = "Average", "yAxis" = "right" }],
        ]
      }
    },
    {
      type   = "metric"
      x      = 0
      y      = 24
      width  = 12
      height = 6
      properties = {
        title   = "UI ECS CPU And Memory"
        region  = data.aws_region.current.region
        period  = 300
        view    = "timeSeries"
        stacked = false
        metrics = [
          ["AWS/ECS", "CPUUtilization", "ClusterName", var.ui_cluster_name, "ServiceName", var.ui_service_name],
          [".", "MemoryUtilization", ".", ".", ".", ".", { "yAxis" = "right" }],
        ]
      }
    },
  ]) : tolist([])
}

resource "aws_sns_topic" "standard" {
  name = local.standard_topic_name

  tags = merge(local.common_tags, {
    Name = local.standard_topic_name
  })
}

resource "aws_sns_topic" "critical" {
  name = local.critical_topic_name

  tags = merge(local.common_tags, {
    Name = local.critical_topic_name
  })
}

resource "aws_sns_topic_subscription" "standard_email" {
  for_each = toset(var.alert_email_addresses)

  topic_arn = aws_sns_topic.standard.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "critical_email" {
  for_each = toset(var.alert_email_addresses)

  topic_arn = aws_sns_topic.critical.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_ssm_parameter" "standard_topic_arn" {
  name  = "/${local.parameter_prefix}/observability/alerts/standard-topic-arn"
  type  = "String"
  value = aws_sns_topic.standard.arn
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "critical_topic_arn" {
  name  = "/${local.parameter_prefix}/observability/alerts/critical-topic-arn"
  type  = "String"
  value = aws_sns_topic.critical.arn
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "dashboard_name" {
  name  = "/${local.parameter_prefix}/observability/dashboard/name"
  type  = "String"
  value = local.dashboard_name
  tags  = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "database_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-database-cpu-high"
  alarm_description   = "Database CPU has been high for 15 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections_high" {
  alarm_name          = "${var.project_name}-${var.environment}-database-connections-high"
  alarm_description   = "Database connections have stayed elevated for 15 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 40
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "database_freeable_memory_low" {
  alarm_name          = "${var.project_name}-${var.environment}-database-freeable-memory-low"
  alarm_description   = "Database freeable memory has stayed low for 15 minutes."
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 268435456
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "database_free_storage_low" {
  alarm_name          = "${var.project_name}-${var.environment}-database-free-storage-low"
  alarm_description   = "Database free storage is critically low."
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "ui_cpu_high" {
  count = local.ui_enabled ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ui-cpu-high"
  alarm_description   = "The wumbo-ui ECS service has sustained high CPU usage."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    ClusterName = var.ui_cluster_name
    ServiceName = var.ui_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "ui_memory_high" {
  count = local.ui_enabled ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ui-memory-high"
  alarm_description   = "The wumbo-ui ECS service has sustained high memory usage."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    ClusterName = var.ui_cluster_name
    ServiceName = var.ui_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "ui_target_response_time_high" {
  count = local.ui_enabled ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ui-target-response-time-high"
  alarm_description   = "The wumbo-ui load balancer target response time is elevated."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 2
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    LoadBalancer = var.ui_alb_arn_suffix
    TargetGroup  = var.ui_target_group_arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "ui_unhealthy_hosts" {
  count = local.ui_enabled ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ui-unhealthy-hosts"
  alarm_description   = "One or more wumbo-ui targets are unhealthy."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.standard.arn]

  dimensions = {
    LoadBalancer = var.ui_alb_arn_suffix
    TargetGroup  = var.ui_target_group_arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "ui_target_5xx_high" {
  count = local.ui_enabled ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-ui-target-5xx-high"
  alarm_description   = "The wumbo-ui app is returning repeated 5xx responses."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    LoadBalancer = var.ui_alb_arn_suffix
    TargetGroup  = var.ui_target_group_arn_suffix
  }
}

resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = local.dashboard_name

  dashboard_body = jsonencode({
    widgets = concat([
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Core Lambda Errors"
          region  = data.aws_region.current.region
          stat    = "Sum"
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", local.post_confirmation_function_name],
            [".", "Errors", "FunctionName", local.publish_outbox_function_name],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Core Lambda Duration"
          region  = data.aws_region.current.region
          stat    = "Average"
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", local.post_confirmation_function_name],
            [".", "Duration", "FunctionName", local.publish_outbox_function_name],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Database Health"
          region  = data.aws_region.current.region
          stat    = "Average"
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.db_instance_identifier],
            [".", "DatabaseConnections", "DBInstanceIdentifier", var.db_instance_identifier],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Database Capacity"
          region  = data.aws_region.current.region
          stat    = "Average"
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.db_instance_identifier],
            [".", "FreeStorageSpace", "DBInstanceIdentifier", var.db_instance_identifier],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Database Read/Write Latency"
          region  = data.aws_region.current.region
          stat    = "Average"
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.db_instance_identifier],
            [".", "WriteLatency", "DBInstanceIdentifier", var.db_instance_identifier],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "EventBridge PutEvents"
          region  = data.aws_region.current.region
          period  = 300
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/Events", "PutEventsApproximateSuccessCount", { "stat" = "Sum" }],
            [".", "PutEventsFailedEntriesCount", { "stat" = "Sum" }],
            [".", "PutEventsLatency", { "stat" = "Average" }],
          ]
        }
      },
    ], local.ui_widgets)
  })
}

variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this observability slice."
  type        = string
}

variable "workload_name" {
  description = "Optional workload name used to scope observability resource names and SSM paths."
  type        = string
  default     = null
  nullable    = true
}

variable "parameter_prefix" {
  description = "Optional SSM parameter prefix without leading or trailing slashes."
  type        = string
  default     = null
  nullable    = true
}

variable "db_instance_identifier" {
  description = "RDS DB instance identifier to monitor."
  type        = string
}

variable "core_service_name" {
  description = "Service name prefix used for core Lambda function naming."
  type        = string
  default     = "wumbo-core"
}

variable "identity_service_name" {
  description = "Service name prefix used for identity Lambda function naming."
  type        = string
  default     = "wumbo-identity"
}

variable "dashboard_name" {
  description = "Optional CloudWatch dashboard name override."
  type        = string
  default     = null
  nullable    = true
}

variable "alert_email_addresses" {
  description = "Email addresses subscribed to both the standard and critical alert topics."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

variable "ui_cluster_name" {
  description = "Optional ECS cluster name for the deployed UI service."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_service_name" {
  description = "Optional ECS service name for the deployed UI service."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_alb_arn_suffix" {
  description = "Optional ALB ARN suffix used for UI CloudWatch metrics."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_target_group_arn_suffix" {
  description = "Optional target group ARN suffix used for UI CloudWatch metrics."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_enabled" {
  description = "Whether the shared dashboard and alarms should include the deployed UI service."
  type        = bool
  default     = false
}

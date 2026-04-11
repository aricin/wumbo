variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this database foundation."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the database should live."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the workload VPC."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs used by the DB subnet group."
  type        = list(string)
}

variable "parameter_prefix" {
  description = "Optional SSM parameter prefix without leading or trailing slashes."
  type        = string
  default     = null
  nullable    = true
}

variable "db_identifier" {
  description = "Optional DB instance identifier. Defaults to a project/environment derived value."
  type        = string
  default     = null
  nullable    = true
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
}

variable "db_username" {
  description = "Master username for the PostgreSQL instance."
  type        = string
  default     = "wumbo"
}

variable "db_port" {
  description = "Port for PostgreSQL."
  type        = number
  default     = 5432
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
}

variable "engine_version" {
  description = "Optional PostgreSQL engine version to pin. Leave null to accept the AWS default for the chosen family."
  type        = string
  default     = null
  nullable    = true
}

variable "parameter_group_family" {
  description = "DB parameter group family, such as postgres16."
  type        = string
}

variable "allocated_storage" {
  description = "Initial allocated storage in GiB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum autoscaled storage in GiB."
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "RDS storage type."
  type        = string
  default     = "gp3"
}

variable "iops" {
  description = "Provisioned IOPS. Leave null unless using an IOPS-backed storage profile."
  type        = number
  default     = null
  nullable    = true
}

variable "multi_az" {
  description = "Whether to create a Multi-AZ standby for higher availability."
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Automated backup retention in days."
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Preferred daily backup window in UTC."
  type        = string
  default     = null
  nullable    = true
}

variable "maintenance_window" {
  description = "Preferred weekly maintenance window in UTC."
  type        = string
  default     = null
  nullable    = true
}

variable "deletion_protection" {
  description = "Whether deletion protection is enabled."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Whether the DB can be destroyed without a final snapshot."
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Whether modifications should be applied immediately."
  type        = bool
  default     = false
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds. Use 0 to disable."
  type        = number
  default     = 0
}

variable "performance_insights_enabled" {
  description = "Whether to enable Performance Insights."
  type        = bool
  default     = false
}

variable "enabled_cloudwatch_logs_exports" {
  description = "PostgreSQL log exports to send to CloudWatch Logs."
  type        = list(string)
  default     = []
}

variable "cloudwatch_logs_retention_in_days" {
  description = "Retention in days for exported PostgreSQL CloudWatch log groups."
  type        = number
  default     = 30
}

variable "slow_query_log_min_duration_ms" {
  description = "Log PostgreSQL statements that take at least this many milliseconds. Set to null to disable."
  type        = number
  default     = 1000
  nullable    = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach PostgreSQL. Defaults to the full VPC CIDR."
  type        = list(string)
  default     = []
}

variable "password_version" {
  description = "Increment to rotate the generated master password."
  type        = number
  default     = 1
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

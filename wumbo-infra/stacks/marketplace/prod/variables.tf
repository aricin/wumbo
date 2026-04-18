variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
  default     = "wumbo"
}

variable "environment" {
  description = "Environment name for this stack."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "Primary AWS region for the workload account."
  type        = string
}

variable "target_account_id" {
  description = "AWS account ID for the target workload account."
  type        = string
}

variable "assume_role_name" {
  description = "Role to assume in the workload account."
  type        = string
  default     = "OrganizationAccountAccessRole"
}

variable "parameter_prefix" {
  description = "Optional SSM parameter prefix without leading or trailing slashes. Defaults to /<project>/<workload>/<environment> for this stack."
  type        = string
  default     = null
  nullable    = true
}

variable "vpc_cidr" {
  description = "CIDR block for the workload VPC."
  type        = string
}

variable "availability_zone_count" {
  description = "Number of AZs to spread private subnets across."
  type        = number
  default     = 2
}

variable "private_subnet_newbits" {
  description = "Number of additional subnet bits used when carving subnets from the VPC CIDR."
  type        = number
  default     = 8
}

variable "public_subnet_count" {
  description = "Number of public subnets to create for the public ALB and low-cost access patterns."
  type        = number
  default     = 2
}

variable "public_subnet_newbits" {
  description = "Number of additional subnet bits used when carving public subnets from the VPC CIDR."
  type        = number
  default     = 8
}

variable "nat_gateway_enabled" {
  description = "Whether to provision a single NAT gateway in the first public subnet for private subnet egress."
  type        = bool
  default     = false
}

variable "db_identifier" {
  description = "Optional DB instance identifier override."
  type        = string
  default     = null
  nullable    = true
}

variable "db_name" {
  description = "Optional initial PostgreSQL database name to create with the shared instance."
  type        = string
  default     = null
  nullable    = true
}

variable "db_username" {
  description = "Master username for PostgreSQL."
  type        = string
  default     = "postgres"
}

variable "db_port" {
  description = "Port for PostgreSQL."
  type        = number
  default     = 5432
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
}

variable "db_engine_version" {
  description = "Optional PostgreSQL engine version to pin."
  type        = string
  default     = null
  nullable    = true
}

variable "db_parameter_group_family" {
  description = "Parameter group family, such as postgres16."
  type        = string
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum autoscaled storage in GiB."
  type        = number
  default     = 100
}

variable "db_storage_type" {
  description = "RDS storage type."
  type        = string
  default     = "gp3"
}

variable "db_iops" {
  description = "Provisioned IOPS. Leave null for gp3 baseline behavior."
  type        = number
  default     = null
  nullable    = true
}

variable "db_multi_az" {
  description = "Whether to enable RDS Multi-AZ."
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Automated backup retention in days."
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Preferred daily backup window in UTC."
  type        = string
  default     = null
  nullable    = true
}

variable "db_maintenance_window" {
  description = "Preferred weekly maintenance window in UTC."
  type        = string
  default     = null
  nullable    = true
}

variable "db_deletion_protection" {
  description = "Whether deletion protection is enabled."
  type        = bool
  default     = true
}

variable "db_skip_final_snapshot" {
  description = "Whether the database can be destroyed without a final snapshot."
  type        = bool
  default     = false
}

variable "db_apply_immediately" {
  description = "Whether DB changes should be applied immediately."
  type        = bool
  default     = false
}

variable "db_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds. Use 0 to disable."
  type        = number
  default     = 0
}

variable "db_performance_insights_enabled" {
  description = "Whether to enable Performance Insights."
  type        = bool
  default     = false
}

variable "db_enabled_cloudwatch_logs_exports" {
  description = "PostgreSQL log exports to send to CloudWatch Logs."
  type        = list(string)
  default     = ["postgresql"]
}

variable "db_cloudwatch_logs_retention_in_days" {
  description = "Retention in days for exported PostgreSQL CloudWatch log groups."
  type        = number
  default     = 30
}

variable "db_slow_query_log_min_duration_ms" {
  description = "Log PostgreSQL statements slower than this many milliseconds."
  type        = number
  default     = 1000
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to PostgreSQL. Defaults to the entire VPC."
  type        = list(string)
  default     = []
}

variable "db_password_version" {
  description = "Increment to rotate the generated master password."
  type        = number
  default     = 1
}

variable "jump_host_instance_type" {
  description = "EC2 instance type for the SSM jump host."
  type        = string
  default     = "t3.nano"
}

variable "jump_host_enabled" {
  description = "Whether to create an SSM jump host for private DB access."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

variable "alert_email_addresses" {
  description = "Email addresses subscribed to both the standard and critical alert topics."
  type        = list(string)
  default     = []
}

variable "ui_domain_name" {
  description = "Optional HTTPS domain name for the deployed wumbo-ui app."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_route53_zone_id" {
  description = "Optional Route53 hosted zone ID used for wumbo-ui DNS validation and alias records."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_certificate_arn" {
  description = "Optional ACM certificate ARN to use for wumbo-ui instead of creating one with Route53 DNS validation."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_github_repository" {
  description = "Optional GitHub repository in owner/name form that is allowed to deploy wumbo-ui in this environment."
  type        = string
  default     = null
  nullable    = true
}

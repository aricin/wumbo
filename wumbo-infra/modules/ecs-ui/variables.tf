variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this UI service."
  type        = string
}

variable "parameter_prefix" {
  description = "Optional SSM parameter prefix without leading or trailing slashes."
  type        = string
  default     = null
  nullable    = true
}

variable "service_name" {
  description = "Logical service name for the deployed UI application."
  type        = string
  default     = "wumbo-ui"
}

variable "repository_name" {
  description = "Optional ECR repository name override."
  type        = string
  default     = null
  nullable    = true
}

variable "cluster_name" {
  description = "Optional ECS cluster name override."
  type        = string
  default     = null
  nullable    = true
}

variable "vpc_id" {
  description = "VPC where the ALB and ECS service will run."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block assigned to the workload VPC."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs used for the internet-facing ALB."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs used for the ECS tasks."
  type        = list(string)
}

variable "container_port" {
  description = "Port exposed by the containerized Next.js app."
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "initial_desired_count" {
  description = "Initial ECS desired count before the first real application image is deployed."
  type        = number
  default     = 0
}

variable "health_check_path" {
  description = "HTTP path used by the target group and ECS container health checks."
  type        = string
  default     = "/healthz"
}

variable "health_check_grace_period_seconds" {
  description = "Grace period before ECS starts failing tasks on health checks."
  type        = number
  default     = 60
}

variable "bootstrap_container_image" {
  description = "Placeholder image used for the initial task definition before the deploy workflow publishes the real image."
  type        = string
  default     = "public.ecr.aws/docker/library/node:22-bookworm-slim"
}

variable "bootstrap_container_command" {
  description = "Command used by the placeholder container image."
  type        = list(string)
  default     = ["sh", "-c", "while true; do sleep 3600; done"]
}

variable "log_retention_in_days" {
  description = "Retention in days for the ECS application log group."
  type        = number
  default     = 30
}

variable "image_retention_count" {
  description = "Number of tagged images to keep in ECR before expiring older ones."
  type        = number
  default     = 25
}

variable "domain_name" {
  description = "Optional HTTPS domain name for the deployed UI app."
  type        = string
  default     = null
  nullable    = true
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted zone ID used for DNS validation and the app alias record."
  type        = string
  default     = null
  nullable    = true
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN to use instead of creating one with DNS validation."
  type        = string
  default     = null
  nullable    = true
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection on the ALB."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "Optional GitHub repository in owner/name form that is allowed to deploy this ECS UI service."
  type        = string
  default     = null
  nullable    = true
}

variable "github_environment" {
  description = "Optional GitHub Actions environment name used in the OIDC subject claim. Defaults to the stack environment."
  type        = string
  default     = null
  nullable    = true
}

variable "github_oidc_provider_arn" {
  description = "Optional IAM OIDC provider ARN for GitHub Actions in this AWS account."
  type        = string
  default     = null
  nullable    = true
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

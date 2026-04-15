variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this EventBridge foundation."
  type        = string
}

variable "workload_name" {
  description = "Optional workload name used to scope EventBridge resource names and SSM paths."
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

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

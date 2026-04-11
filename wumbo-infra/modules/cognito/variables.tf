variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this Cognito foundation."
  type        = string
}

variable "aws_region" {
  description = "AWS region used to build the Cognito issuer URL."
  type        = string
}

variable "parameter_prefix" {
  description = "Optional SSM parameter prefix without leading or trailing slashes."
  type        = string
  default     = null
  nullable    = true
}

variable "allow_self_signup" {
  description = "Whether end users may sign themselves up."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Whether Cognito deletion protection is enabled."
  type        = bool
  default     = false
}

variable "admin_group_name" {
  description = "Default Cognito group name for internal admins."
  type        = string
  default     = "admin"
}

variable "customer_group_name" {
  description = "Default Cognito group name for customer users."
  type        = string
  default     = "customer"
}

variable "ui_domain_prefix" {
  description = "Optional Cognito hosted-login domain prefix for the UI client."
  type        = string
  default     = null
  nullable    = true
}

variable "ui_callback_urls" {
  description = "OAuth callback URLs for the UI client when hosted login is enabled."
  type        = list(string)
  default     = []
}

variable "ui_logout_urls" {
  description = "OAuth logout URLs for the UI client when hosted login is enabled."
  type        = list(string)
  default     = []
}

variable "ui_oauth_scopes" {
  description = "OAuth scopes requested by the UI client when hosted login is enabled."
  type        = list(string)
  default     = ["openid", "email", "profile"]
}

variable "post_confirmation_lambda_arn" {
  description = "Optional Lambda ARN to attach as the Cognito PostConfirmation trigger."
  type        = string
  default     = null
  nullable    = true
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

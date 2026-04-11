variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this jump host."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID where the jump host will run."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the jump host will run."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the workload VPC."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for the jump host."
  type        = string
  default     = "t3.nano"
}

variable "ami_ssm_parameter_name" {
  description = "SSM parameter that resolves to the AMI ID used by the jump host."
  type        = string
  default     = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

variable "remote_port" {
  description = "Port on private services the jump host should be allowed to reach."
  type        = number
  default     = 5432
}

variable "remote_cidr_blocks" {
  description = "CIDR blocks the jump host is allowed to reach on the remote port. Defaults to the VPC CIDR."
  type        = list(string)
  default     = []
}

variable "ssm_parameter_prefix" {
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

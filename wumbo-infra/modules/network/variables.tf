variable "project_name" {
  description = "Project identifier used for naming."
  type        = string
}

variable "environment" {
  description = "Environment name for this network foundation."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the workload VPC."
  type        = string
}

variable "availability_zone_count" {
  description = "Number of AZs to spread the isolated database subnets across."
  type        = number
  default     = 2

  validation {
    condition     = var.availability_zone_count >= 2
    error_message = "RDS requires subnets in at least two Availability Zones."
  }
}

variable "private_subnet_newbits" {
  description = "Number of additional subnet bits used when carving private subnets from the VPC CIDR."
  type        = number
  default     = 8
}

variable "public_subnet_count" {
  description = "Number of public subnets to create for low-cost access patterns like an SSM jump host."
  type        = number
  default     = 0

  validation {
    condition     = var.public_subnet_count >= 0 && var.public_subnet_count <= var.availability_zone_count
    error_message = "public_subnet_count must be between 0 and availability_zone_count."
  }
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

  validation {
    condition     = !var.nat_gateway_enabled || var.public_subnet_count > 0
    error_message = "nat_gateway_enabled requires at least one public subnet."
  }
}

variable "tags" {
  description = "Additional tags applied to created resources."
  type        = map(string)
  default     = {}
}

output "instance_id" {
  description = "EC2 instance ID for the SSM jump host."
  value       = aws_instance.this.id
}

output "instance_arn" {
  description = "ARN of the SSM jump host EC2 instance."
  value       = aws_instance.this.arn
}

output "public_ip" {
  description = "Public IP associated with the jump host instance."
  value       = aws_instance.this.public_ip
}

output "security_group_id" {
  description = "Security group attached to the jump host."
  value       = aws_security_group.instance.id
}

output "parameter_prefix" {
  description = "Resolved SSM parameter prefix used by this module."
  value       = "/${local.parameter_prefix}"
}

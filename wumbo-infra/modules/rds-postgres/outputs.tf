output "db_instance_id" {
  description = "RDS instance identifier."
  value       = aws_db_instance.database.id
}

output "db_instance_identifier" {
  description = "Configured DB instance identifier."
  value       = aws_db_instance.database.identifier
}

output "db_instance_arn" {
  description = "ARN of the RDS instance."
  value       = aws_db_instance.database.arn
}

output "db_address" {
  description = "DNS address of the RDS instance."
  value       = aws_db_instance.database.address
}

output "db_port" {
  description = "Port exposed by the RDS instance."
  value       = aws_db_instance.database.port
}

output "db_security_group_id" {
  description = "Security group attached to the RDS instance."
  value       = aws_security_group.database.id
}

output "master_secret_arn" {
  description = "Secrets Manager ARN containing the master password."
  value       = aws_secretsmanager_secret.master_password.arn
}

output "kms_key_arn" {
  description = "KMS key ARN protecting the database storage and master secret."
  value       = aws_kms_key.database.arn
}

output "parameter_prefix" {
  description = "Resolved SSM parameter prefix for database metadata."
  value       = "/${local.parameter_prefix}"
}

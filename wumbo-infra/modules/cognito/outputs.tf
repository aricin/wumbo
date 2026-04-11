output "parameter_prefix" {
  description = "Resolved SSM parameter prefix used by this module."
  value       = "/${local.parameter_prefix}"
}

output "user_pool_id" {
  description = "Cognito user pool ID."
  value       = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  description = "Cognito user pool ARN."
  value       = aws_cognito_user_pool.this.arn
}

output "issuer_url" {
  description = "JWT issuer URL for the Cognito user pool."
  value       = local.issuer_url
}

output "ui_client_id" {
  description = "App client ID intended for the customer-facing UI."
  value       = aws_cognito_user_pool_client.ui.id
}

output "ui_domain_url" {
  description = "Cognito hosted-login domain URL for the UI client, if configured."
  value       = local.ui_domain_url
}

output "ui_callback_urls" {
  description = "OAuth callback URLs configured for the UI client."
  value       = var.ui_callback_urls
}

output "ui_logout_urls" {
  description = "OAuth logout URLs configured for the UI client."
  value       = var.ui_logout_urls
}

output "admin_client_id" {
  description = "App client ID intended for the internal admin UI."
  value       = aws_cognito_user_pool_client.admin.id
}

output "jwt_audiences" {
  description = "JWT audiences that wumbo-core should accept."
  value       = [aws_cognito_user_pool_client.ui.id, aws_cognito_user_pool_client.admin.id]
}

output "admin_group_name" {
  description = "Default admin group name."
  value       = aws_cognito_user_group.admin.name
}

output "customer_group_name" {
  description = "Default customer group name."
  value       = aws_cognito_user_group.customer.name
}

output "post_confirmation_lambda_arn" {
  description = "Configured Cognito PostConfirmation trigger Lambda ARN, if any."
  value       = local.post_confirmation_lambda_arn
}

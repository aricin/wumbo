locals {
  naming_prefix                = "${var.project_name}-${var.service_name}-${var.environment}"
  parameter_prefix             = trim(var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${var.service_name}/${var.environment}", "/")
  issuer_url                   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
  ui_domain_prefix             = var.ui_domain_prefix != null && trimspace(var.ui_domain_prefix) != "" ? trimspace(var.ui_domain_prefix) : null
  ui_hosted_login_enabled      = local.ui_domain_prefix != null
  ui_domain_url                = local.ui_hosted_login_enabled ? "https://${local.ui_domain_prefix}.auth.${var.aws_region}.amazoncognito.com" : null
  post_confirmation_lambda_arn = var.post_confirmation_lambda_arn != null && trimspace(var.post_confirmation_lambda_arn) != "" ? trimspace(var.post_confirmation_lambda_arn) : null

  common_tags = merge(
    var.tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Service     = var.service_name
    },
  )
}

data "aws_caller_identity" "current" {}

resource "aws_cognito_user_pool" "this" {
  name                     = local.naming_prefix
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = var.deletion_protection ? "ACTIVE" : "INACTIVE"
  mfa_configuration        = "OFF"

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  admin_create_user_config {
    allow_admin_create_user_only = !var.allow_self_signup
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  dynamic "lambda_config" {
    for_each = local.post_confirmation_lambda_arn != null ? [local.post_confirmation_lambda_arn] : []

    content {
      post_confirmation = lambda_config.value
    }
  }

  tags = merge(local.common_tags, {
    Name = local.naming_prefix
  })

  depends_on = [aws_lambda_permission.post_confirmation]
}

resource "aws_cognito_user_group" "admin" {
  name         = var.admin_group_name
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Internal admin users for ${var.project_name} ${var.environment}."
  precedence   = 10
}

resource "aws_cognito_user_group" "customer" {
  name         = var.customer_group_name
  user_pool_id = aws_cognito_user_pool.this.id
  description  = "Customer users for ${var.project_name} ${var.environment}."
  precedence   = 20
}

resource "aws_cognito_user_pool_client" "ui" {
  name                                 = "${local.naming_prefix}-ui"
  user_pool_id                         = aws_cognito_user_pool.this.id
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  access_token_validity                = 60
  id_token_validity                    = 60
  refresh_token_validity               = 30
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_USER_SRP_AUTH"]
  supported_identity_providers         = ["COGNITO"]
  allowed_oauth_flows_user_pool_client = local.ui_hosted_login_enabled
  allowed_oauth_flows                  = local.ui_hosted_login_enabled ? ["code"] : []
  allowed_oauth_scopes                 = local.ui_hosted_login_enabled ? var.ui_oauth_scopes : []
  callback_urls                        = local.ui_hosted_login_enabled ? var.ui_callback_urls : []
  logout_urls                          = local.ui_hosted_login_enabled ? var.ui_logout_urls : []

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  lifecycle {
    precondition {
      condition = (
        local.ui_hosted_login_enabled &&
        length(var.ui_callback_urls) > 0 &&
        length(var.ui_logout_urls) > 0
        ) || (
        !local.ui_hosted_login_enabled &&
        length(var.ui_callback_urls) == 0 &&
        length(var.ui_logout_urls) == 0
      )
      error_message = "UI hosted login requires a domain prefix plus at least one callback URL and one logout URL."
    }
  }
}

resource "aws_cognito_user_pool_client" "admin" {
  name                          = "${local.naming_prefix}-admin"
  user_pool_id                  = aws_cognito_user_pool.this.id
  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  access_token_validity         = 60
  id_token_validity             = 60
  refresh_token_validity        = 30
  explicit_auth_flows           = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_USER_SRP_AUTH"]
  supported_identity_providers  = ["COGNITO"]

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "ui" {
  count = local.ui_hosted_login_enabled ? 1 : 0

  domain       = local.ui_domain_prefix
  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_lambda_permission" "post_confirmation" {
  count = local.post_confirmation_lambda_arn != null ? 1 : 0

  statement_id   = "${local.naming_prefix}-cognito-post-confirmation"
  action         = "lambda:InvokeFunction"
  function_name  = local.post_confirmation_lambda_arn
  principal      = "cognito-idp.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
}

resource "aws_ssm_parameter" "user_pool_id" {
  name  = "/${local.parameter_prefix}/cognito/user-pool-id"
  type  = "String"
  value = aws_cognito_user_pool.this.id
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "user_pool_arn" {
  name  = "/${local.parameter_prefix}/cognito/user-pool-arn"
  type  = "String"
  value = aws_cognito_user_pool.this.arn
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "issuer_url" {
  name  = "/${local.parameter_prefix}/cognito/issuer-url"
  type  = "String"
  value = local.issuer_url
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "ui_client_id" {
  name  = "/${local.parameter_prefix}/cognito/ui-client-id"
  type  = "String"
  value = aws_cognito_user_pool_client.ui.id
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "admin_client_id" {
  name  = "/${local.parameter_prefix}/cognito/admin-client-id"
  type  = "String"
  value = aws_cognito_user_pool_client.admin.id
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "jwt_audiences" {
  name  = "/${local.parameter_prefix}/cognito/jwt-audiences"
  type  = "StringList"
  value = join(",", [aws_cognito_user_pool_client.ui.id, aws_cognito_user_pool_client.admin.id])
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "ui_domain_url" {
  count = local.ui_hosted_login_enabled ? 1 : 0

  name  = "/${local.parameter_prefix}/cognito/ui-domain-url"
  type  = "String"
  value = local.ui_domain_url
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "ui_callback_urls" {
  count = local.ui_hosted_login_enabled ? 1 : 0

  name  = "/${local.parameter_prefix}/cognito/ui-callback-urls"
  type  = "StringList"
  value = join(",", var.ui_callback_urls)
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "ui_logout_urls" {
  count = local.ui_hosted_login_enabled ? 1 : 0

  name  = "/${local.parameter_prefix}/cognito/ui-logout-urls"
  type  = "StringList"
  value = join(",", var.ui_logout_urls)
  tags  = local.common_tags
}

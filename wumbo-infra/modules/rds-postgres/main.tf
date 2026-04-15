locals {
  identifier       = coalesce(var.db_identifier, "${var.project_name}-${var.database_label}-${var.environment}-postgres")
  parameter_prefix = trim(var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${var.environment}", "/")
  allowed_cidrs    = length(var.allowed_cidr_blocks) > 0 ? var.allowed_cidr_blocks : [var.vpc_cidr]

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Layer       = "database"
    Database    = var.database_label
  })

  parameter_group_parameters = var.slow_query_log_min_duration_ms == null ? [] : [
    {
      name         = "log_min_duration_statement"
      value        = tostring(var.slow_query_log_min_duration_ms)
      apply_method = "immediate"
    }
  ]
}

resource "aws_kms_key" "database" {
  description             = "KMS key for ${var.project_name} ${var.environment} PostgreSQL storage and secrets."
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.common_tags
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.project_name}/${var.environment}/databases/${var.database_label}"
  target_key_id = aws_kms_key.database.key_id
}

resource "aws_security_group" "database" {
  name        = "${local.identifier}-sg"
  description = "Access to PostgreSQL for ${var.project_name} ${var.environment}."
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL"
    from_port   = var.db_port
    to_port     = var.db_port
    protocol    = "tcp"
    cidr_blocks = local.allowed_cidrs
  }

  egress {
    description = "Allow all egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-sg"
  })
}

resource "aws_db_subnet_group" "database" {
  name       = "${local.identifier}-subnets"
  subnet_ids = var.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-subnets"
  })
}

resource "aws_db_parameter_group" "database" {
  name   = "${local.identifier}-params"
  family = var.parameter_group_family

  dynamic "parameter" {
    for_each = local.parameter_group_parameters

    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-params"
  })
}

resource "aws_cloudwatch_log_group" "database_exports" {
  for_each = toset(var.enabled_cloudwatch_logs_exports)

  name              = "/aws/rds/instance/${local.identifier}/${each.value}"
  retention_in_days = var.cloudwatch_logs_retention_in_days

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-${each.value}-logs"
  })
}

resource "aws_secretsmanager_secret" "master_password" {
  name        = "${local.identifier}/master-password"
  description = "Master password for ${local.identifier}."
  kms_key_id  = aws_kms_key.database.arn

  tags = merge(local.common_tags, {
    Name = "${local.identifier}-master-password"
  })
}

ephemeral "random_password" "master" {
  length           = 24
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret_version" "master_password" {
  secret_id                = aws_secretsmanager_secret.master_password.id
  secret_string_wo         = ephemeral.random_password.master.result
  secret_string_wo_version = var.password_version
}

ephemeral "aws_secretsmanager_secret_version" "master_password" {
  secret_id = aws_secretsmanager_secret_version.master_password.secret_id
}

resource "aws_db_instance" "database" {
  identifier                      = local.identifier
  engine                          = "postgres"
  engine_version                  = var.engine_version
  instance_class                  = var.instance_class
  allocated_storage               = var.allocated_storage
  max_allocated_storage           = var.max_allocated_storage
  storage_type                    = var.storage_type
  iops                            = var.iops
  db_name                         = var.db_name
  username                        = var.db_username
  password_wo                     = ephemeral.aws_secretsmanager_secret_version.master_password.secret_string
  password_wo_version             = var.password_version
  port                            = var.db_port
  db_subnet_group_name            = aws_db_subnet_group.database.name
  vpc_security_group_ids          = [aws_security_group.database.id]
  parameter_group_name            = aws_db_parameter_group.database.name
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.database.arn
  publicly_accessible             = false
  multi_az                        = var.multi_az
  backup_retention_period         = var.backup_retention_period
  backup_window                   = var.backup_window
  maintenance_window              = var.maintenance_window
  deletion_protection             = var.deletion_protection
  skip_final_snapshot             = var.skip_final_snapshot
  final_snapshot_identifier       = var.skip_final_snapshot ? null : "${local.identifier}-final"
  apply_immediately               = var.apply_immediately
  monitoring_interval             = var.monitoring_interval
  performance_insights_enabled    = var.performance_insights_enabled
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  auto_minor_version_upgrade      = true
  copy_tags_to_snapshot           = true

  depends_on = [aws_cloudwatch_log_group.database_exports]

  tags = merge(local.common_tags, {
    Name = local.identifier
  })
}

resource "aws_ssm_parameter" "database_host" {
  name  = "/${local.parameter_prefix}/databases/${var.database_label}/host"
  type  = "String"
  value = aws_db_instance.database.address
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "database_port" {
  name  = "/${local.parameter_prefix}/databases/${var.database_label}/port"
  type  = "String"
  value = tostring(aws_db_instance.database.port)
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "database_name" {
  name  = "/${local.parameter_prefix}/databases/${var.database_label}/name"
  type  = "String"
  value = var.db_name
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "database_username" {
  name  = "/${local.parameter_prefix}/databases/${var.database_label}/username"
  type  = "String"
  value = var.db_username
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "database_secret_arn" {
  name  = "/${local.parameter_prefix}/databases/${var.database_label}/secret-arn"
  type  = "String"
  value = aws_secretsmanager_secret.master_password.arn
  tags  = local.common_tags
}

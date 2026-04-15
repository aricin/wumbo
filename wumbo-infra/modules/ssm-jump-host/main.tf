data "aws_ssm_parameter" "ami" {
  name = var.ami_ssm_parameter_name
}

locals {
  remote_cidrs     = length(var.remote_cidr_blocks) > 0 ? var.remote_cidr_blocks : [var.vpc_cidr]
  naming_prefix    = var.workload_name != null ? "${var.project_name}-${var.workload_name}-${var.environment}" : "${var.project_name}-${var.environment}"
  parameter_prefix = trim(var.ssm_parameter_prefix != null ? var.ssm_parameter_prefix : (var.workload_name != null ? "/${var.project_name}/${var.workload_name}/${var.environment}" : "/${var.project_name}/${var.environment}"), "/")
  instance_name    = "${local.naming_prefix}-jump"

  common_tags = merge(
    var.tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Layer       = "jump-host"
    },
    var.workload_name != null ? { Workload = var.workload_name } : {},
  )
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "instance" {
  name               = "${local.instance_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = merge(local.common_tags, {
    Name = "${local.instance_name}-role"
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "instance" {
  name = "${local.instance_name}-profile"
  role = aws_iam_role.instance.name

  tags = merge(local.common_tags, {
    Name = "${local.instance_name}-profile"
  })
}

resource "aws_security_group" "instance" {
  name        = "${local.instance_name}-sg"
  description = "No-ingress security group for the ${local.instance_name} SSM jump host."
  vpc_id      = var.vpc_id

  egress {
    description = "HTTPS to AWS public endpoints for Session Manager"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Private service access through the VPC"
    from_port   = var.remote_port
    to_port     = var.remote_port
    protocol    = "tcp"
    cidr_blocks = local.remote_cidrs
  }

  tags = merge(local.common_tags, {
    Name = "${local.instance_name}-sg"
  })
}

resource "aws_instance" "this" {
  ami                         = data.aws_ssm_parameter.ami.value
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  iam_instance_profile        = aws_iam_instance_profile.instance.name
  vpc_security_group_ids      = [aws_security_group.instance.id]
  associate_public_ip_address = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = merge(local.common_tags, {
    Name = local.instance_name
  })
}

resource "aws_ssm_parameter" "instance_id" {
  name  = "/${local.parameter_prefix}/ops/jump-host/instance-id"
  type  = "String"
  value = aws_instance.this.id
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "instance_security_group_id" {
  name  = "/${local.parameter_prefix}/ops/jump-host/security-group-id"
  type  = "String"
  value = aws_security_group.instance.id
  tags  = local.common_tags
}

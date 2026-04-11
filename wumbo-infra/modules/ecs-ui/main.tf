data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  parameter_prefix = trim(var.parameter_prefix != null ? var.parameter_prefix : "/${var.project_name}/${var.environment}", "/")

  repository_name = coalesce(var.repository_name, var.service_name)
  cluster_name    = coalesce(var.cluster_name, "${var.project_name}-${var.environment}-apps")
  task_family     = "${var.project_name}-${var.environment}-${var.service_name}"

  alb_name          = "${var.project_name}-${var.environment}-${var.service_name}-alb"
  target_group_name = "${var.project_name}-${var.environment}-${var.service_name}-tg"
  log_group_name    = "/${var.project_name}/${var.environment}/${var.service_name}"

  route53_validation_enabled = var.domain_name != null && var.route53_zone_id != null && var.certificate_arn == null
  https_enabled              = var.domain_name != null && (var.certificate_arn != null || local.route53_validation_enabled)
  effective_certificate_arn = var.certificate_arn != null ? var.certificate_arn : (
    local.route53_validation_enabled ? aws_acm_certificate_validation.this[0].certificate_arn : null
  )

  custom_domain_url = local.https_enabled ? "https://${var.domain_name}" : null
  app_url           = local.custom_domain_url != null ? local.custom_domain_url : "http://${aws_lb.this.dns_name}"

  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Layer       = "ui"
  })

  github_deploy_role_enabled = var.github_repository != null && var.github_oidc_provider_arn != null
  github_environment         = coalesce(var.github_environment, var.environment)

  ssm_parameter_arns = [
    "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.parameter_prefix}/ui/app/*",
    "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.parameter_prefix}/auth/cognito/ui-domain-url",
    "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.parameter_prefix}/auth/cognito/ui-client-id",
    "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.parameter_prefix}/auth/cognito/ui-callback-urls",
    "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.parameter_prefix}/auth/cognito/ui-logout-urls",
  ]
}

resource "aws_ecr_repository" "this" {
  name                 = local.repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = local.repository_name
  })
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire old tagged images."
        selection = {
          tagStatus   = "tagged"
          countType   = "imageCountMoreThan"
          countNumber = var.image_retention_count
        }
        action = {
          type = "expire"
        }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_in_days

  tags = merge(local.common_tags, {
    Name = local.log_group_name
  })
}

resource "aws_ecs_cluster" "this" {
  name = local.cluster_name

  tags = merge(local.common_tags, {
    Name = local.cluster_name
  })
}

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-${var.service_name}-alb-sg"
  description = "Security group for the wumbo-ui Application Load Balancer."
  vpc_id      = var.vpc_id

  ingress {
    description = "Public HTTP"
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Public HTTPS"
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound traffic from the load balancer"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}-alb-sg"
  })
}

resource "aws_security_group" "service" {
  name        = "${var.project_name}-${var.environment}-${var.service_name}-svc-sg"
  description = "Security group for the wumbo-ui ECS tasks."
  vpc_id      = var.vpc_id

  ingress {
    description     = "Traffic from the public ALB"
    protocol        = "tcp"
    from_port       = var.container_port
    to_port         = var.container_port
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound traffic from the UI app"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}-svc-sg"
  })
}

resource "aws_lb" "this" {
  name                       = local.alb_name
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.public_subnet_ids
  idle_timeout               = 60
  enable_deletion_protection = var.deletion_protection

  tags = merge(local.common_tags, {
    Name = local.alb_name
  })
}

resource "aws_lb_target_group" "this" {
  name                 = local.target_group_name
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200-399"
    path                = var.health_check_path
  }

  tags = merge(local.common_tags, {
    Name = local.target_group_name
  })
}

resource "aws_lb_listener" "http_forward" {
  count = local.https_enabled ? 0 : 1

  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count = local.https_enabled ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_acm_certificate" "this" {
  count = local.route53_validation_enabled ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = var.domain_name
  })
}

resource "aws_route53_record" "certificate_validation" {
  for_each = local.route53_validation_enabled ? {
    for option in aws_acm_certificate.this[0].domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "this" {
  count = local.route53_validation_enabled ? 1 : 0

  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_lb_listener" "https" {
  count = local.https_enabled ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = local.effective_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

resource "aws_route53_record" "app" {
  count = local.https_enabled && var.route53_zone_id != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    evaluate_target_health = true
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
  }
}

resource "aws_iam_role" "execution" {
  name = "${var.project_name}-${var.environment}-${var.service_name}-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}-exec"
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.project_name}-${var.environment}-${var.service_name}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}-task"
  })
}

resource "aws_iam_role" "github_actions" {
  count = local.github_deploy_role_enabled ? 1 : 0

  name = "${var.project_name}-${var.environment}-${var.service_name}-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.github_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${local.github_environment}"
          }
        }
      },
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${var.service_name}-deploy"
  })
}

resource "aws_iam_role_policy" "github_actions" {
  count = local.github_deploy_role_enabled ? 1 : 0

  name = "${var.project_name}-${var.environment}-${var.service_name}-deploy"
  role = aws_iam_role.github_actions[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadDeployMetadata"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
        ]
        Resource = local.ssm_parameter_arns
      },
      {
        Sid    = "EcrLogin"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
        ]
        Resource = "*"
      },
      {
        Sid    = "PushUiImages"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
        ]
        Resource = aws_ecr_repository.this.arn
      },
      {
        Sid    = "DeployEcsService"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
        ]
        Resource = "*"
      },
      {
        Sid    = "PassTaskRoles"
        Effect = "Allow"
        Action = [
          "iam:PassRole",
        ]
        Resource = [
          aws_iam_role.execution.arn,
          aws_iam_role.task.arn,
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
    ]
  })
}

resource "aws_ecs_task_definition" "this" {
  family                   = local.task_family
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.bootstrap_container_image
      essential = true
      command   = var.bootstrap_container_command
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        },
      ]
      environment = [
        {
          name  = "APP_ENV"
          value = var.environment
        },
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "HOSTNAME"
          value = "0.0.0.0"
        },
      ]
      healthCheck = {
        command = [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:${var.container_port}${var.health_check_path}').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))\"",
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = var.health_check_grace_period_seconds
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = data.aws_region.current.region
          awslogs-stream-prefix = "ecs"
        }
      }
    },
  ])

  tags = merge(local.common_tags, {
    Name = local.task_family
  })
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.initial_desired_count
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds  = var.health_check_grace_period_seconds
  wait_for_steady_state              = false

  network_configuration {
    assign_public_ip = false
    security_groups  = [aws_security_group.service.id]
    subnets          = var.private_subnet_ids
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  lifecycle {
    ignore_changes = [
      desired_count,
      task_definition,
    ]
  }

  depends_on = [
    aws_lb_listener.http_forward,
    aws_lb_listener.http_redirect,
    aws_lb_listener.https,
  ]

  tags = merge(local.common_tags, {
    Name = var.service_name
  })
}

resource "aws_ssm_parameter" "repository_url" {
  name  = "/${local.parameter_prefix}/ui/app/ecr-repository-url"
  type  = "String"
  value = aws_ecr_repository.this.repository_url
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "cluster_name" {
  name  = "/${local.parameter_prefix}/ui/app/ecs-cluster-name"
  type  = "String"
  value = aws_ecs_cluster.this.name
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "service_name" {
  name  = "/${local.parameter_prefix}/ui/app/ecs-service-name"
  type  = "String"
  value = aws_ecs_service.this.name
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "task_family" {
  name  = "/${local.parameter_prefix}/ui/app/ecs-task-family"
  type  = "String"
  value = aws_ecs_task_definition.this.family
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "app_url" {
  name  = "/${local.parameter_prefix}/ui/app/base-url"
  type  = "String"
  value = local.app_url
  tags  = local.common_tags
}

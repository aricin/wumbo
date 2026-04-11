# ecs-ui

`ecs-ui` provisions the AWS resources needed to run a containerized web UI on ECS Fargate.

It creates:

- an ECR repository
- an ECS cluster
- an ECS task definition and service
- an internet-facing ALB and target group
- a CloudWatch Logs log group for application logs
- an optional GitHub Actions deploy role scoped to this ECS UI service
- optional HTTPS wiring with ACM + Route53
- SSM parameters for the deploy workflow

The module intentionally bootstraps the ECS service with `desired_count = 0` and a
placeholder task definition. The first real application deploy should come from the
`wumbo-ui` GitHub Actions workflow, which:

1. builds the real container image
2. pushes it to the module-created ECR repository
3. registers a new task definition revision
4. updates the ECS service to the real desired count

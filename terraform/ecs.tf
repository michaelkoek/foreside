resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_cloudwatch_log_group" "beer_service" {
  name              = "/ecs/${var.project_name}/beer-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "order_service" {
  name              = "/ecs/${var.project_name}/order-service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "gateway" {
  name              = "/ecs/${var.project_name}/gateway"
  retention_in_days = 7
}

# Cloud Map — private DNS so services find each other by name instead of IP
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project_name}.local"
  vpc  = aws_vpc.main.id
}

resource "aws_service_discovery_service" "beer_service" {
  name = "beer-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "order_service" {
  name = "order-service"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Task definitions
resource "aws_ecs_task_definition" "beer_service" {
  family                   = "${var.project_name}-beer-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.beer_service_task.arn

  container_definitions = jsonencode([{
    name  = "beer-service"
    image = "${aws_ecr_repository.beer_service.repository_url}:latest"

    portMappings = [{ containerPort = 50051, protocol = "tcp" }]

    environment = [
      { name = "HOST", value = "0.0.0.0" },
      { name = "PORT", value = "50051" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.beer_service.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "order_service" {
  family                   = "${var.project_name}-order-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.order_service_task.arn

  container_definitions = jsonencode([{
    name  = "order-service"
    image = "${aws_ecr_repository.order_service.repository_url}:latest"

    portMappings = [{ containerPort = 50052, protocol = "tcp" }]

    environment = [
      { name = "HOST", value = "0.0.0.0" },
      { name = "PORT", value = "50052" },
      { name = "BEER_SERVICE_URL", value = "beer-service.${var.project_name}.local:50051" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.order_service.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "gateway" {
  family                   = "${var.project_name}-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.gateway_task.arn

  container_definitions = jsonencode([{
    name  = "gateway"
    image = "${aws_ecr_repository.gateway.repository_url}:latest"

    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "HOST", value = "0.0.0.0" },
      { name = "PORT", value = "3000" },
      { name = "BEER_SERVICE_URL", value = "beer-service.${var.project_name}.local:50051" },
      { name = "ORDER_SERVICE_URL", value = "order-service.${var.project_name}.local:50052" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.gateway.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ECS Services
resource "aws_ecs_service" "beer_service" {
  name            = "${var.project_name}-beer-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.beer_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.internal.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.beer_service.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_ecs_service" "order_service" {
  name            = "${var.project_name}-order-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.order_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.internal.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.order_service.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_ecs_service" "gateway" {
  name            = "${var.project_name}-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.gateway.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.http]
}

# ALB — accepts HTTP from internet, forwards only to gateway
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "ALB — inbound HTTP from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.gateway.id]
  }
}

# Gateway — only reachable from ALB, can reach microservices and ECR
resource "aws_security_group" "gateway" {
  name        = "${var.project_name}-gateway"
  description = "Gateway — inbound from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # gRPC to microservices
  egress {
    from_port       = 50051
    to_port         = 50052
    protocol        = "tcp"
    security_groups = [aws_security_group.internal.id]
  }

  # HTTPS for ECR image pulls and CloudWatch logs
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS for Cloud Map service discovery
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Internal — microservices, only reachable from gateway and each other
resource "aws_security_group" "internal" {
  name        = "${var.project_name}-internal"
  description = "Microservices — inbound from gateway and peers only"
  vpc_id      = aws_vpc.main.id

  # gRPC from gateway
  ingress {
    from_port       = 50051
    to_port         = 50052
    protocol        = "tcp"
    security_groups = [aws_security_group.gateway.id]
  }

  # gRPC from peers (order-service → beer-service)
  ingress {
    from_port = 50051
    to_port   = 50052
    protocol  = "tcp"
    self      = true
  }

  # HTTPS for ECR image pulls and CloudWatch logs
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS for Cloud Map service discovery
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security groups — defined without cross-SG rules to avoid dependency cycles.
# Rules that reference another SG are added below as aws_security_group_rule resources.

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "ALB — inbound HTTP from internet"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "gateway" {
  name        = "${var.project_name}-gateway"
  description = "Gateway — inbound from ALB only"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "internal" {
  name        = "${var.project_name}-internal"
  description = "Microservices — inbound from gateway and peers only"
  vpc_id      = aws_vpc.main.id
}

# --- ALB rules ---

resource "aws_security_group_rule" "alb_ingress_http" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "alb_egress_gateway" {
  type                     = "egress"
  security_group_id        = aws_security_group.alb.id
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.gateway.id
}

# --- Gateway rules ---

resource "aws_security_group_rule" "gateway_ingress_alb" {
  type                     = "ingress"
  security_group_id        = aws_security_group.gateway.id
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "gateway_egress_grpc" {
  type                     = "egress"
  security_group_id        = aws_security_group.gateway.id
  from_port                = 50051
  to_port                  = 50052
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.internal.id
}

resource "aws_security_group_rule" "gateway_egress_https" {
  type              = "egress"
  security_group_id = aws_security_group.gateway.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "gateway_egress_dns" {
  type              = "egress"
  security_group_id = aws_security_group.gateway.id
  from_port         = 53
  to_port           = 53
  protocol          = "udp"
  cidr_blocks       = ["0.0.0.0/0"]
}

# --- Internal (microservices) rules ---

resource "aws_security_group_rule" "internal_ingress_gateway" {
  type                     = "ingress"
  security_group_id        = aws_security_group.internal.id
  from_port                = 50051
  to_port                  = 50052
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.gateway.id
}

resource "aws_security_group_rule" "internal_ingress_self" {
  type              = "ingress"
  security_group_id = aws_security_group.internal.id
  from_port         = 50051
  to_port           = 50052
  protocol          = "tcp"
  self              = true
}

resource "aws_security_group_rule" "internal_egress_https" {
  type              = "egress"
  security_group_id = aws_security_group.internal.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "internal_egress_dns" {
  type              = "egress"
  security_group_id = aws_security_group.internal.id
  from_port         = 53
  to_port           = 53
  protocol          = "udp"
  cidr_blocks       = ["0.0.0.0/0"]
}

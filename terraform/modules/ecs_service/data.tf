data "aws_ecs_cluster" "ecs_cluster" {
  cluster_name = "${var.project_name}-ecs-cluster"
}

data "aws_security_group" "ecs_sg" {
  name = data.aws_ecs_cluster.ecs_cluster.cluster_name
}

data "aws_vpc" "vpc" {
  cidr_block = var.vpc_cidr
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.vpc.id]
  }

  tags = {
    is_public = "true"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.vpc.id]
  }

  tags = {
    is_public = "false"
  }
}

resource "aws_security_group" "security_group" {
  name        = "${var.project_name}-${var.service_name}-alb-sg"
  description = "Security group for ALB of ${var.service_name}"
  vpc_id      = data.aws_vpc.vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.service_name}-alb-sg"
  }
}

resource "aws_ssm_parameter" "access_key_id" {
  name  = "/${var.project_name}/${var.service_name}/access_key_id"
  type  = "SecureString"
  value = "placeholder"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "secret_access_key" {
  name  = "/${var.project_name}/${var.service_name}/secret_access_key"
  type  = "SecureString"
  value = "placeholder"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "session_token" {
  name  = "/${var.project_name}/${var.service_name}/session_token"
  type  = "SecureString"
  value = "placeholder"

  lifecycle {
    ignore_changes = [value]
  }
}

data "aws_ecr_image" "service" {
  repository_name = var.ecr_repository_name
  image_tag       = var.ecr_image_tag
}

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

resource "aws_iam_role" "monitoring" {
  name = "${var.project_name}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "monitoring_ec2_describe" {
  name = "${var.project_name}-monitoring-ec2-describe"
  role = aws_iam_role.monitoring.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ec2:DescribeInstances"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "monitoring" {
  name = "${var.project_name}-monitoring-profile"
  role = aws_iam_role.monitoring.name
}

module "monitoring" {
  source = "../../modules/monitoring"

  project_name              = var.project_name
  vpc_id                    = data.aws_vpc.vpc.id
  vpc_cidr                  = var.vpc_cidr
  subnet_id                 = data.aws_subnets.public.ids[0]
  ssh_key_name              = var.ssh_key_name
  instance_type             = var.monitoring_instance_type
  aws_region                = var.aws_region
  iam_instance_profile_name = aws_iam_instance_profile.monitoring.name
}

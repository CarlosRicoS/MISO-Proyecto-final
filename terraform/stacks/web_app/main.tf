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

data "aws_ecr_repository" "web_app" {
  name = var.ecr_repository_name
}

resource "aws_iam_role" "web_app" {
  name = "${var.project_name}-${var.app_name}-role"

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

resource "aws_iam_role_policy" "web_app_ecr_ssm" {
  name = "${var.project_name}-${var.app_name}-ecr-ssm"
  role = aws_iam_role.web_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "ssm:GetParameter"
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter${var.api_gateway_ssm_path}"
      }
    ]
  })
}

# Allows the SSM agent on the EC2 instance to communicate with the SSM service.
# Required for SSM Run Command (remote redeploy without SSH).
resource "aws_iam_role_policy_attachment" "web_app_ssm_core" {
  role       = aws_iam_role.web_app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "web_app" {
  name = "${var.project_name}-${var.app_name}-profile"
  role = aws_iam_role.web_app.name
}

module "web_app" {
  source = "../../modules/web_app"

  project_name              = var.project_name
  app_name                  = var.app_name
  vpc_id                    = data.aws_vpc.vpc.id
  vpc_cidr                  = var.vpc_cidr
  subnet_id                 = data.aws_subnets.public.ids[0]
  ssh_key_name              = var.ssh_key_name
  instance_type             = var.web_app_instance_type
  aws_region                = var.aws_region
  iam_instance_profile_name = aws_iam_instance_profile.web_app.name
  ecr_repository_url        = data.aws_ecr_repository.web_app.repository_url
  image_tag                 = var.image_tag
  api_gateway_ssm_path      = var.api_gateway_ssm_path
}

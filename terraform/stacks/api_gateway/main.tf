data "aws_vpc" "vpc" {
  cidr_block = var.vpc_cidr
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

data "aws_ssm_parameter" "alb_listener_arn" {
  for_each = toset(var.service_names)
  name     = "/${var.project_name}/${each.key}/alb_listener_arn"
}

resource "aws_ssm_parameter" "api_gateway_url" {
  name  = "/${var.project_name}/api-gateway/url"
  type  = "String"
  value = module.api_gateway.api_endpoint
}

module "api_gateway" {
  source     = "../../modules/api_gateway"
  api_name   = "${var.project_name}-api"
  subnet_ids = data.aws_subnets.private.ids
  vpc_id     = data.aws_vpc.vpc.id
  vpc_cidr   = var.vpc_cidr

  services = {
    for name in var.service_names : name => {
      listener_arn = data.aws_ssm_parameter.alb_listener_arn[name].value
      route_prefix = name
    }
  }
}

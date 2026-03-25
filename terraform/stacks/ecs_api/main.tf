data "aws_caller_identity" "current" {}

locals {
  any_service_needs_db = anytrue([for s in var.services : s.create_database])
  services_with_db     = { for k, v in var.services : k => v if v.create_database }

  # SSM paths that are created within this stack (service-level DB credentials)
  # Computed purely from var.services so it's available at plan time
  internal_ssm_param_paths = toset(flatten([
    for svc_name, config in var.services : config.create_database ? [
      "/${var.project_name}/${svc_name}/db_host",
      "/${var.project_name}/${svc_name}/db_name",
      "/${var.project_name}/${svc_name}/db_username",
      "/${var.project_name}/${svc_name}/db_password",
    ] : []
  ]))

  # service_url SSM paths created by module "ecs_service" within this stack
  internal_service_url_paths = toset([
    for svc_name, _ in var.services : "/${var.project_name}/${svc_name}/service_url"
  ])

  # Only data-source the external params (those NOT created in this stack)
  external_secret_param_paths = toset(flatten([
    for config in values(var.services) : [
      for s in lookup(config, "secrets", []) : s.valueFrom
      if startswith(s.valueFrom, "/") && !contains(local.internal_ssm_param_paths, s.valueFrom) && !contains(local.internal_service_url_paths, s.valueFrom)
    ]
  ]))

  # Map from internal SSM path → resource ARN (resolved at apply time, after resources exist)
  internal_ssm_param_arns = merge(
    { for k, v in aws_ssm_parameter.service_db_host     : "/${var.project_name}/${k}/db_host"     => v.arn },
    { for k, v in aws_ssm_parameter.service_db_name     : "/${var.project_name}/${k}/db_name"     => v.arn },
    { for k, v in aws_ssm_parameter.service_db_username : "/${var.project_name}/${k}/db_username" => v.arn },
    { for k, v in aws_ssm_parameter.service_db_password : "/${var.project_name}/${k}/db_password" => v.arn },
    # service_url ARNs synthesized from deterministic ARN format (no data source needed)
    { for svc_name, _ in var.services :
      "/${var.project_name}/${svc_name}/service_url" =>
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${svc_name}/service_url"
    },
  )
}

# --- SSM parameter lookup for secrets (resolve paths to ARNs) ---

data "aws_ssm_parameter" "secret_ref" {
  for_each = local.external_secret_param_paths
  name     = each.value
}

# --- ECR repository URL lookup per service ---

data "aws_ssm_parameter" "ecr_repository_url" {
  for_each = var.services
  name     = "/${var.project_name}/ecr/${each.value.ecr_repository_name}/repository_url"
}

# --- Optional per-service database on shared RDS instance ---

data "aws_ssm_parameter" "db_host" {
  count = local.any_service_needs_db ? 1 : 0
  name  = "/${var.project_name}/rds/host"
}

data "aws_ssm_parameter" "db_port" {
  count = local.any_service_needs_db ? 1 : 0
  name  = "/${var.project_name}/rds/port"
}

data "aws_ssm_parameter" "db_username" {
  count = local.any_service_needs_db ? 1 : 0
  name  = "/${var.project_name}/rds/username"
}

data "aws_ssm_parameter" "db_password" {
  count           = local.any_service_needs_db ? 1 : 0
  name            = "/${var.project_name}/rds/password"
  with_decryption = true
}

provider "postgresql" {
  host     = local.any_service_needs_db ? data.aws_ssm_parameter.db_host[0].value : "localhost"
  port     = local.any_service_needs_db ? tonumber(data.aws_ssm_parameter.db_port[0].value) : 5432
  username = local.any_service_needs_db ? data.aws_ssm_parameter.db_username[0].value : "unused"
  password = local.any_service_needs_db ? data.aws_ssm_parameter.db_password[0].value : "unused"
  sslmode  = "require"
}

resource "postgresql_database" "service" {
  for_each = local.services_with_db
  name     = replace(each.key, "-", "_")
}

resource "aws_ssm_parameter" "service_db_host" {
  for_each  = local.services_with_db
  name      = "/${var.project_name}/${each.key}/db_host"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_host[0].value
  overwrite = true
}

resource "aws_ssm_parameter" "service_db_name" {
  for_each  = local.services_with_db
  name      = "/${var.project_name}/${each.key}/db_name"
  type      = "String"
  value     = postgresql_database.service[each.key].name
  overwrite = true
}

resource "aws_ssm_parameter" "service_db_username" {
  for_each  = local.services_with_db
  name      = "/${var.project_name}/${each.key}/db_username"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_username[0].value
  overwrite = true
  depends_on = [aws_ssm_parameter.service_db_host]
}

resource "aws_ssm_parameter" "service_db_password" {
  for_each  = local.services_with_db
  name      = "/${var.project_name}/${each.key}/db_password"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_password[0].value
  overwrite = true
  depends_on = [aws_ssm_parameter.service_db_username]
}

# --- Shared IAM role for all ECS tasks ---

module "ecsTaskExecutionRole" {
  source = "../../modules/iam"

  role_name        = "ecsTaskExecutionRole"
  role_description = "Allows ECS tasks to call AWS services on your behalf."

  service_principal = [
    "ecs-tasks.amazonaws.com"
  ]

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonSSMFullAccess",
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
    "arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess",
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonCognitoPowerUser",
  ]
}

# --- ECS service per entry in the services map ---

module "ecs_service" {
  for_each = var.services
  source   = "../../modules/ecs_service"

  project_name              = var.project_name
  aws_region                = var.aws_region
  service_name              = each.key
  desired_count_tasks       = each.value.desired_count_tasks
  vpc_cidr                  = var.vpc_cidr
  container_port            = each.value.container_port
  ec2_image_uri             = "${data.aws_ssm_parameter.ecr_repository_url[each.key].value}:latest"
  ecs_task_size             = each.value.ecs_task_size
  ecs-task-execution-role   = module.ecsTaskExecutionRole.role_arn
  ecr_repository_name       = each.value.ecr_repository_name
  container_name            = each.value.container_name
  capacity_provider_name    = var.capacity_provider_name
  force_new_deployment      = each.value.force_new_deployment
  placement_constraint_type = each.value.placement_constraint_type
  runtime_platform          = each.value.runtime_platform
  health_check              = each.value.health_check
  deregistration_delay      = each.value.deregistration_delay
  autoscaling               = each.value.autoscaling
  alb_internal              = each.value.alb_internal
  alb_idle_timeout          = each.value.alb_idle_timeout
  environment_variables     = lookup(each.value, "environment_variables", [])
  secrets = [for s in lookup(each.value, "secrets", []) : {
    name = s.name
    valueFrom = (
      startswith(s.valueFrom, "arn:") ? s.valueFrom :
      contains(keys(local.internal_ssm_param_arns), s.valueFrom) ? local.internal_ssm_param_arns[s.valueFrom] :
      data.aws_ssm_parameter.secret_ref[s.valueFrom].arn
    )
  }]
}

# --- VPC Endpoint for Cognito IDP (tasks have no public IP) ---

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

# Filter subnets to only AZs supported by the cognito-idp endpoint service
data "aws_vpc_endpoint_service" "cognito_idp" {
  service = "cognito-idp"
}

data "aws_subnet" "public" {
  for_each = toset(data.aws_subnets.public.ids)
  id       = each.value
}

locals {
  cognito_vpce_subnet_ids = [
    for id, s in data.aws_subnet.public : id
    if contains(data.aws_vpc_endpoint_service.cognito_idp.availability_zones, s.availability_zone)
  ]
}

resource "aws_security_group" "cognito_vpce" {
  name        = "${var.project_name}-cognito-vpce-sg"
  description = "Allow HTTPS inbound for Cognito VPC endpoint"
  vpc_id      = data.aws_vpc.vpc.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = { Name = "${var.project_name}-cognito-vpce-sg" }
}

resource "aws_vpc_endpoint" "cognito_idp" {
  vpc_id              = data.aws_vpc.vpc.id
  service_name        = "com.amazonaws.${var.aws_region}.cognito-idp"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = local.cognito_vpce_subnet_ids
  security_group_ids  = [aws_security_group.cognito_vpce.id]

  tags = { Name = "${var.project_name}-cognito-idp-vpce" }
}


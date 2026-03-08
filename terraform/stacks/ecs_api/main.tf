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

  # Only data-source the external params (those NOT created in this stack)
  external_secret_param_paths = toset(flatten([
    for config in values(var.services) : [
      for s in lookup(config, "secrets", []) : s.valueFrom
      if startswith(s.valueFrom, "/") && !contains(local.internal_ssm_param_paths, s.valueFrom)
    ]
  ]))

  # Map from internal SSM path → resource ARN (resolved at apply time, after resources exist)
  internal_ssm_param_arns = merge(
    { for k, v in aws_ssm_parameter.service_db_host     : "/${var.project_name}/${k}/db_host"     => v.arn },
    { for k, v in aws_ssm_parameter.service_db_name     : "/${var.project_name}/${k}/db_name"     => v.arn },
    { for k, v in aws_ssm_parameter.service_db_username : "/${var.project_name}/${k}/db_username" => v.arn },
    { for k, v in aws_ssm_parameter.service_db_password : "/${var.project_name}/${k}/db_password" => v.arn },
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


data "aws_ssm_parameter" "ecr_repository_url" {
  name = "/${var.project_name}/ecr/${var.ecr_repository_name}/repository_url"
}

# --- Optional per-service database on shared RDS instance ---

data "aws_ssm_parameter" "db_host" {
  count = var.create_database ? 1 : 0
  name  = "/${var.project_name}/rds/host"
}

data "aws_ssm_parameter" "db_port" {
  count = var.create_database ? 1 : 0
  name  = "/${var.project_name}/rds/port"
}

data "aws_ssm_parameter" "db_username" {
  count = var.create_database ? 1 : 0
  name  = "/${var.project_name}/rds/username"
}

data "aws_ssm_parameter" "db_password" {
  count           = var.create_database ? 1 : 0
  name            = "/${var.project_name}/rds/password"
  with_decryption = true
}

provider "postgresql" {
  host     = var.create_database ? data.aws_ssm_parameter.db_host[0].value : "localhost"
  port     = var.create_database ? tonumber(data.aws_ssm_parameter.db_port[0].value) : 5432
  username = var.create_database ? data.aws_ssm_parameter.db_username[0].value : "unused"
  password = var.create_database ? data.aws_ssm_parameter.db_password[0].value : "unused"
  sslmode  = "require"
}

resource "postgresql_database" "service" {
  count = var.create_database ? 1 : 0
  name  = replace(var.service_name, "-", "_")
}

resource "aws_ssm_parameter" "service_db_host" {
  count     = var.create_database ? 1 : 0
  name      = "/${var.project_name}/${var.service_name}/db_host"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_host[0].value
  overwrite = true
}

resource "aws_ssm_parameter" "service_db_name" {
  count     = var.create_database ? 1 : 0
  name      = "/${var.project_name}/${var.service_name}/db_name"
  type      = "String"
  value     = postgresql_database.service[0].name
  overwrite = true
}

resource "aws_ssm_parameter" "service_db_username" {
  count     = var.create_database ? 1 : 0
  name      = "/${var.project_name}/${var.service_name}/db_username"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_username[0].value
  overwrite = true
}

resource "aws_ssm_parameter" "service_db_password" {
  count     = var.create_database ? 1 : 0
  name      = "/${var.project_name}/${var.service_name}/db_password"
  type      = "SecureString"
  value     = data.aws_ssm_parameter.db_password[0].value
  overwrite = true
}

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

module "ecs_service_hello_world" {
  source = "../../modules/ecs_service"

  project_name              = var.project_name
  aws_region                = var.aws_region
  service_name              = var.service_name
  desired_count_tasks       = var.desired_count_tasks
  vpc_cidr                  = var.vpc_cidr
  container_port            = var.container_port
  ec2_image_uri             = "${data.aws_ssm_parameter.ecr_repository_url.value}:latest"
  ecs_task_size             = var.ecs_task_size
  ecs-task-execution-role   = module.ecsTaskExecutionRole.role_arn
  ecr_repository_name       = var.ecr_repository_name
  container_name            = var.container_name
  capacity_provider_name    = var.capacity_provider_name
  force_new_deployment      = var.force_new_deployment
  placement_constraint_type = var.placement_constraint_type
  runtime_platform          = var.runtime_platform
  health_check              = var.health_check
  deregistration_delay      = var.deregistration_delay
  autoscaling               = var.autoscaling
  alb_internal              = var.alb_internal
  alb_idle_timeout          = var.alb_idle_timeout
}
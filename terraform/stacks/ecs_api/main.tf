data "aws_ssm_parameter" "ecr_repository_url" {
  name = "/${var.project_name}/ecr/${var.ecr_repository_name}/repository_url"
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

  project_name            = var.project_name
  aws_region              = var.aws_region
  service_name            = var.service_name
  desired_count_tasks     = var.desired_count_tasks
  vpc_cidr                = var.vpc_cidr
  container_port          = var.container_port
  ec2_image_uri           = "${data.aws_ssm_parameter.ecr_repository_url.value}:latest"
  ecs_task_size           = var.ecs_task_size
  ecs-task-execution-role = module.ecsTaskExecutionRole.role_arn
  ecr_repository_name     = var.ecr_repository_name
}
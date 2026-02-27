aws_region = "us-east-1"

project_name        = "final-project-miso"
service_name        = "hello-world"
ecr_repository_name = "api_hello_world"
desired_count_tasks = 2
vpc_cidr            = "172.16.0.0/16"
container_port      = 80
ecs_task_size = {
  "cpu"    = 1024
  "memory" = 1024
}

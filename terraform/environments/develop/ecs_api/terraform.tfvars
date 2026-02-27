aws_region                      = "us-east-1"
keep_tags_number                = 2
repository_name_hello_world_app = "api_hello_world"

project_name        = "final-project-miso"
service_name        = "hello-world"
desired_count_tasks = 2
vpc_cidr            = "172.16.0.0/16"
container_port      = 80
ecs_task_size = {
  "cpu"    = 1024
  "memory" = 1024
}





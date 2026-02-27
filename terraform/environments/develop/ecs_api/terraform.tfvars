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

container_name            = "web_app"
capacity_provider_name    = "capacity-provider"
force_new_deployment      = true
placement_constraint_type = "distinctInstance"
runtime_platform = {
  "os_family"        = "LINUX"
  "cpu_architecture" = "X86_64"
}
health_check = {
  "path"                = "/api/health"
  "interval"            = 15
  "timeout"             = 5
  "healthy_threshold"   = 2
  "unhealthy_threshold" = 2
  "matcher"             = "200"
}
deregistration_delay = 30
autoscaling = {
  "max_capacity"           = 6
  "min_capacity"           = 2
  "target_cpu_utilization" = 40
  "scale_out_cooldown"     = 30
}
alb_internal     = true
alb_idle_timeout = 60

create_database = true

aws_region   = "us-east-1"
project_name = "final-project-miso"
vpc_cidr     = "172.16.0.0/16"

capacity_provider_name = "capacity-provider"

services = {
  "hello-world" = {
    ecr_repository_name = "api_hello_world"
    create_database     = true
  }
  "other-service" = {
    ecr_repository_name = "api_other_service"
    create_database     = true
  }
  "pms" = {
    ecr_repository_name = "api_pms"
    create_database     = false
    desired_count_tasks = 1
    autoscaling = {
      max_capacity = 1
      min_capacity = 1
    }
    environment_variables = [
      {
        name  = "PROPERTIES_ENDPOINT"
        value = "api/properties/lock"
      }
    ]
    secrets = [
      {
        name      = "PROPERTIES_SERVICE_URL"
        valueFrom = "/final-project-miso/hello-world/alb_listener_arn"
      }
    ]
  }
}

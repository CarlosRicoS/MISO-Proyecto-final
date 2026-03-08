aws_region   = "us-east-1"
project_name = "final-project-miso"
vpc_cidr     = "172.16.0.0/16"

capacity_provider_name = "capacity-provider"

services = {
  "pms" = {
    ecr_repository_name = "api_pms"
    container_name      = "api_pms"
    ecs_task_size       = { cpu = 1024, memory = 615 }
    create_database     = false
    desired_count_tasks = 1
    autoscaling = {
      max_capacity = 1
      min_capacity = 1
    }
    environment_variables = [
      {
        name  = "PROPERTIES_ENDPOINT"
        value = "api/property/lock"
      }
    ]
    secrets = [
      {
        name      = "PROPERTIES_SERVICE_URL"
        valueFrom = "/final-project-miso/poc-properties/service_url"
      }
    ]
  }
  "poc-properties" = {
    ecr_repository_name       = "api_poc_properties"
    container_name            = "api_poc_properties"
    ecs_task_size             = { cpu = 1024, memory = 615 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/actuator/health"
    }
    autoscaling = {
      max_capacity           = 6
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    environment_variables = [
      {
        name  = "JPA_SHOW_SQL"
        value = "false"
      },
      {
        name  = "JPA_DDL_AUTO"
        value = "none"
      },
      {
        name  = "HIKARI_MAX_POOL_SIZE"
        value = "20"
      }
    ]
    secrets = [
      {
        name      = "DB_USERNAME"
        valueFrom = "/final-project-miso/poc-properties/db_username"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "/final-project-miso/poc-properties/db_password"
      },
      {
        name      = "DB_HOST"
        valueFrom = "/final-project-miso/poc-properties/db_host"
      },
      {
        name      = "DB_NAME"
        valueFrom = "/final-project-miso/poc-properties/db_name"
      }
    ]
  }
  "pricing-engine" = {
    ecr_repository_name       = "api_pricing_engine"
    container_name            = "api_pricing_engine"
    ecs_task_size             = { cpu = 1024, memory = 615 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity           = 6
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    health_check = {
      path = "/api/health"
    }
    secrets = [
      {
        name      = "DB_USERNAME"
        valueFrom = "/final-project-miso/pricing-engine/db_username"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "/final-project-miso/pricing-engine/db_password"
      },
      {
        name      = "DB_HOST"
        valueFrom = "/final-project-miso/pricing-engine/db_host"
      },
      {
        name      = "DB_NAME"
        valueFrom = "/final-project-miso/pricing-engine/db_name"
      }
    ]
  }
  "pricing-orchestator" = {
    ecr_repository_name       = "api_pricing_orchestator"
    container_name            = "api_pricing_orchestator"
    ecs_task_size             = { cpu = 1024, memory = 615 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/health"
    }
    autoscaling = {
      max_capacity           = 6
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    secrets = [
      {
        name      = "PROPERTIES_SERVICE_URL"
        valueFrom = "/final-project-miso/poc-properties/service_url"
      },
      {
        name      = "PRICING_SERVICE_URL"
        valueFrom = "/final-project-miso/pricing-engine/service_url"
      }
    ]
  }
}

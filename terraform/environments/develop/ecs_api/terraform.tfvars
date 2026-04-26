aws_region   = "us-east-1"
project_name = "final-project-miso"
vpc_cidr     = "172.16.0.0/16"

capacity_provider_name = "capacity-provider"

services = {
  "auth" = {
    ecr_repository_name       = "api_auth"
    container_name            = "api_auth"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity = 1
      min_capacity = 1
    }
    secrets = [
      {
        name      = "COGNITO_USER_POOL_ID"
        valueFrom = "/final-project-miso/cognito/user_pool_id"
      },
      {
        name      = "COGNITO_CLIENT_ID"
        valueFrom = "/final-project-miso/cognito/app_client_id"
      }
    ]
  }
  "pms" = {
    ecr_repository_name       = "api_pms"
    container_name            = "api_pms"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    desired_count_tasks       = 0
    placement_constraint_type = ""
    autoscaling = {
      max_capacity = 1
      min_capacity = 0
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
    ecs_task_size             = { cpu = 512, memory = 921 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/actuator/health"
    }
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    environment_variables = [
      {
        name  = "JPA_SHOW_SQL"
        value = "true"
      },
      {
        name  = "JPA_DDL_AUTO"
        value = "update"
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
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity           = 1
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
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/health"
    }
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    secrets = [
      {
        name      = "PROPERTIES_ENGINE_URL"
        valueFrom = "/final-project-miso/poc-properties/service_url"
      },
      {
        name      = "PRICING_SERVICE_URL"
        valueFrom = "/final-project-miso/pricing-engine/service_url"
      }
    ]
  }
  "booking" = {
    ecr_repository_name       = "api_booking"
    container_name            = "api_booking"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = true
    container_port            = 80
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity           = 1
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
        valueFrom = "/final-project-miso/booking/db_username"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "/final-project-miso/booking/db_password"
      },
      {
        name      = "DB_HOST"
        valueFrom = "/final-project-miso/booking/db_host"
      },
      {
        name      = "DB_NAME"
        valueFrom = "/final-project-miso/booking/db_name"
      }
    ]
  }
  "booking-orchestrator" = {
    ecr_repository_name       = "api_booking_orchestrator"
    container_name            = "api_booking_orchestrator"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    container_port            = 80
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 60
      scale_out_cooldown     = 30
    }
    health_check = {
      path = "/api/health"
    }
    secrets = [
      {
        name      = "BOOKING_SERVICE_URL"
        valueFrom = "/final-project-miso/booking/service_url"
      },
      {
        name      = "PROPERTIES_SERVICE_URL"
        valueFrom = "/final-project-miso/poc-properties/service_url"
      },
      {
        name      = "NOTIFICATIONS_QUEUE_URL"
        valueFrom = "/final-project-miso/notifications/queue_url"
      },
      {
        name      = "STRIPE_MOCK_SERVICE_URL"
        valueFrom = "/final-project-miso/stripe-mock/service_url"
      },
      {
        name      = "BILLING_QUEUE_URL"
        valueFrom = "/final-project-miso/billing/queue_url"
      }
    ]
  }
  "billing" = {
    ecr_repository_name       = "api_billing"
    container_name            = "api_billing"
    ecs_task_size             = { cpu = 512, memory = 921 }
    create_database           = true
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/actuator/health"
    }
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
    environment_variables = [
      {
        name  = "JPA_SHOW_SQL"
        value = "true"
      },
      {
        name  = "JPA_DDL_AUTO"
        value = "update"
      },
      {
        name  = "HIKARI_MAX_POOL_SIZE"
        value = "20"
      },
      {
        name  = "AWS_REGION"
        value = "us-east-1"
      }
    ]
    secrets = [
      {
        name      = "DB_USERNAME"
        valueFrom = "/final-project-miso/billing/db_username"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "/final-project-miso/billing/db_password"
      },
      {
        name      = "DB_HOST"
        valueFrom = "/final-project-miso/billing/db_host"
      },
      {
        name      = "DB_NAME"
        valueFrom = "/final-project-miso/billing/db_name"
      },
      {
        name      = "BILLING_QUEUE_URL"
        valueFrom = "/final-project-miso/billing/queue_url"
      },
      {
        name      = "AWS_ACCESS_KEY"
        valueFrom = "/final-project-miso/billing/aws_access_key"
      },
      {
        name      = "AWS_SECRET_KEY"
        valueFrom = "/final-project-miso/billing/aws_secret_key"
      }
    ]
  }
  "stripe-mock" = {
    ecr_repository_name       = "api_stripe_mock"
    container_name            = "api_stripe_mock"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    container_port            = 8080
    desired_count_tasks       = 1
    placement_constraint_type = ""
    health_check = {
      path = "/api/actuator/health"
    }
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 35
      scale_out_cooldown     = 30
    }
  }
  "notifications" = {
    ecr_repository_name       = "api_notifications"
    container_name            = "api_notifications"
    ecs_task_size             = { cpu = 256, memory = 512 }
    create_database           = false
    container_port            = 80
    desired_count_tasks       = 1
    placement_constraint_type = ""
    autoscaling = {
      max_capacity           = 1
      min_capacity           = 1
      target_cpu_utilization = 60
      scale_out_cooldown     = 30
    }
    health_check = {
      path = "/api/health"
    }
    environment_variables = [
      {
        name  = "FCM_TOKENS_SSM_PATH"
        value = "/final-project-miso/notifications/fcm-tokens"
      }
    ]
    secrets = [
      {
        name      = "NOTIFICATIONS_QUEUE_URL"
        valueFrom = "/final-project-miso/notifications/queue_url"
      },
      {
        name      = "SMTP_HOST"
        valueFrom = "/final-project-miso/notifications/smtp_host"
      },
      {
        name      = "SMTP_PORT"
        valueFrom = "/final-project-miso/notifications/smtp_port"
      },
      {
        name      = "SMTP_USERNAME"
        valueFrom = "/final-project-miso/notifications/smtp_username"
      },
      {
        name      = "SMTP_PASSWORD"
        valueFrom = "/final-project-miso/notifications/smtp_password"
      },
      {
        name      = "SMTP_FROM"
        valueFrom = "/final-project-miso/notifications/smtp_from"
      },
      {
        name      = "FIREBASE_CREDENTIALS_JSON"
        valueFrom = "/final-project-miso/notifications/firebase_credentials_json"
      },
      {
        name      = "FIREBASE_PROJECT_ID"
        valueFrom = "/final-project-miso/notifications/firebase_project_id"
      }
    ]
  }
}

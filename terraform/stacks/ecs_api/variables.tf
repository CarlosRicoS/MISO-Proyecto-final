variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "172.16.0.0/16"
}

variable "capacity_provider_name" {
  description = "Name of the ECS capacity provider"
  type        = string
  default     = "capacity-provider"
}

variable "services" {
  description = "Map of services to deploy. Key is the service name (kebab-case)."
  type = map(object({
    ecr_repository_name       = string
    create_database           = optional(bool, false)
    desired_count_tasks       = optional(number, 2)
    container_port            = optional(number, 80)
    ecs_task_size             = optional(map(any), { cpu = 1024, memory = 1024 })
    container_name            = optional(string, "web_app")
    force_new_deployment      = optional(bool, true)
    placement_constraint_type = optional(string, "distinctInstance")
    runtime_platform = optional(object({
      os_family        = optional(string, "LINUX")
      cpu_architecture = optional(string, "X86_64")
    }), {})
    health_check = optional(object({
      path                = optional(string, "/api/health")
      interval            = optional(number, 15)
      timeout             = optional(number, 5)
      healthy_threshold   = optional(number, 2)
      unhealthy_threshold = optional(number, 2)
      matcher             = optional(string, "200")
    }), {})
    deregistration_delay = optional(number, 30)
    autoscaling = optional(object({
      max_capacity           = optional(number, 6)
      min_capacity           = optional(number, 2)
      target_cpu_utilization = optional(number, 40)
      scale_out_cooldown     = optional(number, 30)
    }), {})
    alb_internal     = optional(bool, true)
    alb_idle_timeout = optional(number, 60)
  }))
}

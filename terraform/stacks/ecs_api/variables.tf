variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository for this service."
  type        = string
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "service_name" {
  description = "The name of the ECS service."
  type        = string
}

variable "desired_count_tasks" {
  description = "The desired count for the ECS tasks."
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "172.16.0.0/16"
}

variable "container_port" {
  description = "Port the container listens on."
  type        = number
  default     = 80
}

variable "ecs_task_size" {
  description = "CPU and memory for the ECS task."
  type        = map(any)
  default = {
    "cpu"    = 1024
    "memory" = 1024
  }
}

variable "container_name" {
  description = "Name of the container in the task definition"
  type        = string
  default     = "web_app"
}

variable "capacity_provider_name" {
  description = "Name of the ECS capacity provider"
  type        = string
  default     = "capacity-provider"
}

variable "force_new_deployment" {
  description = "Force a new deployment of the ECS service"
  type        = bool
  default     = true
}

variable "placement_constraint_type" {
  description = "Placement constraint type for ECS tasks"
  type        = string
  default     = "distinctInstance"
}

variable "runtime_platform" {
  description = "Runtime platform for the ECS task definition"
  type = object({
    os_family        = optional(string, "LINUX")
    cpu_architecture = optional(string, "X86_64")
  })
  default = {}
}

variable "health_check" {
  description = "Health check configuration for the target group"
  type = object({
    path                = optional(string, "/api/health")
    interval            = optional(number, 15)
    timeout             = optional(number, 5)
    healthy_threshold   = optional(number, 2)
    unhealthy_threshold = optional(number, 2)
    matcher             = optional(string, "200")
  })
  default = {}
}

variable "deregistration_delay" {
  description = "Target group deregistration delay in seconds"
  type        = number
  default     = 30
}

variable "autoscaling" {
  description = "Auto-scaling configuration for the ECS service"
  type = object({
    max_capacity           = optional(number, 6)
    min_capacity           = optional(number, 2)
    target_cpu_utilization = optional(number, 40)
    scale_out_cooldown     = optional(number, 30)
  })
  default = {}
}

variable "alb_internal" {
  description = "Whether the ALB is internal"
  type        = bool
  default     = true
}

variable "alb_idle_timeout" {
  description = "Idle timeout for the ALB in seconds"
  type        = number
  default     = 60
}

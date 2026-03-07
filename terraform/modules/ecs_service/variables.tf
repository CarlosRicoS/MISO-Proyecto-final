variable "project_name" {
  type    = string
  default = "final-project-miso"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "service_name" {
  type        = string
  description = "The name of the service"
}

variable "ecs_cluster_name" {
  type        = string
  description = "The Name of the ECS Cluster"
  default     = "final-project-miso-ecs-cluster"
}

variable "desired_count_tasks" {
  type        = number
  description = "The desired count for the ecs tasks within the cluster"
  default     = 2
}

variable "ecs-task-execution-role" {
  type = string
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR"
  default     = "172.16.0.0/16"
}

variable "container_port" {
  type    = number
  default = 80
}

variable "ec2_image_uri" {
  type        = string
  description = "The image URI used within EC2 task definition"
}

variable "ecs_task_size" {
  type = map(any)
  default = {
    "cpu"    = 1024
    "memory" = 1024
  }
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "Secrets for the container from SSM/Secrets Manager"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "container_command" {
  description = "Optional command to run in the container"
  type        = list(string)
  default     = null
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "ecr_image_tag" {
  description = "Image tag to deploy"
  type        = string
  default     = "latest"
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
  description = "Placement constraint type for ECS tasks (distinctInstance, memberOf, or null/empty to allow multiple tasks per instance)"
  type        = string
  default     = "distinctInstance"
  nullable    = true
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


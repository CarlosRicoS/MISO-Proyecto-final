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

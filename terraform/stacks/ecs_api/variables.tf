variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "keep_tags_number" {
  description = "The number of image tags to retain in the registry."
  type        = number
  default     = 5
}

variable "repository_name_hello_world_app" {
  description = "The name of the Hello World APP repository in the Amazon ECR service."
  type        = string
  nullable    = false
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
